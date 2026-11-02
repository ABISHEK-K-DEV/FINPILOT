import { describe, expect, it } from "vitest";
import { del, patch, post, registerUser, systemCategoryId } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

const base = { type: "EXPENSE", amount: "499.50", currency: "INR", transactionDate: "2026-10-15" };

describe("transactions CRUD", () => {
  it("creates, reads, filters, updates and deletes a transaction", async () => {
    const u = await registerUser();
    const food = await systemCategoryId(u.agent, "food");
    const created = await post(u.agent, "/api/v1/transactions", {
      ...base, categoryId: food, merchant: "Udupi Café", paymentMethod: "UPI", tags: ["Lunch", "lunch"],
    });
    expect(created.status).toBe(201);
    const tx = created.body.transaction;
    expect(tx).toMatchObject({ amount: "499.5000", currency: "INR", transactionDate: "2026-10-15", source: "MANUAL", isSample: false });
    expect(tx.tags).toEqual(["lunch"]);

    const list = await u.agent.get("/api/v1/transactions?month=2026-10&search=udupi");
    expect(list.body.total).toBe(1);
    const other = await u.agent.get("/api/v1/transactions?month=2026-09");
    expect(other.body.total).toBe(0);

    const updated = await patch(u.agent, `/api/v1/transactions/${tx.id}`, { amount: "520", merchant: "" });
    expect(updated.status).toBe(200);
    expect(updated.body.transaction.amount).toBe("520.0000");
    expect(updated.body.transaction.merchant).toBeNull();
    expect(updated.body.transaction.categoryId).toBe(food);

    expect((await del(u.agent, `/api/v1/transactions/${tx.id}`)).status).toBe(204);
    expect((await u.agent.get(`/api/v1/transactions/${tx.id}`)).status).toBe(404);
  });

  it("validates amounts and dates strictly", async () => {
    const u = await registerUser();
    for (const amount of [499.5, "-1", "0", "1.23456", "1e3", "abc"]) {
      const res = await post(u.agent, "/api/v1/transactions", { ...base, amount });
      expect(res.status, `amount ${amount}`).toBe(400);
      expect(res.body.error.fields).toHaveProperty("amount");
    }
    const badDate = await post(u.agent, "/api/v1/transactions", { ...base, transactionDate: "2026-02-30" });
    expect(badDate.body.error.fields).toHaveProperty("transactionDate");
  });

  it("rejects a category of the wrong kind", async () => {
    const u = await registerUser();
    const salary = await systemCategoryId(u.agent, "salary");
    const res = await post(u.agent, "/api/v1/transactions", { ...base, categoryId: salary });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.categoryId).toMatch(/expense/i);
  });

  it("encrypts notes at rest and binds ciphertext to the owner", async () => {
    const u = await registerUser();
    const res = await post(u.agent, "/api/v1/transactions", { ...base, notes: "Paid for Riya's birthday gift" });
    expect(res.body.transaction.notes).toBe("Paid for Riya's birthday gift");
    const row = await prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transaction.id } });
    expect(row.notesEnc).toMatch(/^v1:/);
    expect(row.notesEnc).not.toContain("Riya");

    // Moving the ciphertext to another user's row must not decrypt.
    const other = await registerUser();
    const otherTx = await post(other.agent, "/api/v1/transactions", base);
    await prisma.transaction.update({ where: { id: otherTx.body.transaction.id }, data: { notesEnc: row.notesEnc } });
    const leaked = await other.agent.get(`/api/v1/transactions/${otherTx.body.transaction.id}`);
    expect(leaked.status).toBe(500);
    expect(JSON.stringify(leaked.body)).not.toContain("Riya");
  });

  it("paginates and sorts by amount", async () => {
    const u = await registerUser();
    for (const amount of ["10", "30", "20"]) await post(u.agent, "/api/v1/transactions", { ...base, amount });
    const res = await u.agent.get("/api/v1/transactions?sort=amount_desc&pageSize=2&page=1");
    expect(res.body.items.map((t: { amount: string }) => t.amount)).toEqual(["30.0000", "20.0000"]);
    expect(res.body.totalPages).toBe(2);
  });
});

describe("user data isolation", () => {
  it("never exposes or modifies another user's transactions", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const tx = (await post(alice.agent, "/api/v1/transactions", { ...base, merchant: "Alice private" })).body.transaction;

    expect((await bob.agent.get(`/api/v1/transactions/${tx.id}`)).status).toBe(404);
    expect((await patch(bob.agent, `/api/v1/transactions/${tx.id}`, { amount: "1" })).status).toBe(404);
    expect((await del(bob.agent, `/api/v1/transactions/${tx.id}`)).status).toBe(404);

    const bobList = await bob.agent.get("/api/v1/transactions?search=Alice");
    expect(bobList.body.total).toBe(0);
    const bobDash = await bob.agent.get("/api/v1/dashboard?month=2026-10");
    expect(bobDash.body.report.summary.expenses).toBe("0.0000");

    const still = await alice.agent.get(`/api/v1/transactions/${tx.id}`);
    expect(still.body.transaction.amount).toBe("499.5000");
  });

  it("does not allow using or editing another user's custom category", async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const cat = (await post(alice.agent, "/api/v1/categories", { name: "Pet care", kind: "EXPENSE" })).body.category;

    const bobCats = await bob.agent.get("/api/v1/categories");
    expect(bobCats.body.items.find((c: { id: string }) => c.id === cat.id)).toBeUndefined();
    const res = await post(bob.agent, "/api/v1/transactions", { ...base, categoryId: cat.id });
    expect(res.status).toBe(400);
    expect((await patch(bob.agent, `/api/v1/categories/${cat.id}`, { name: "Hacked" })).status).toBe(404);
    expect((await del(bob.agent, `/api/v1/categories/${cat.id}`)).status).toBe(404);
    expect((await post(bob.agent, "/api/v1/budgets", { categoryId: cat.id, amount: "100" })).status).toBe(400);
  });

  it("does not allow modifying system categories", async () => {
    const u = await registerUser();
    const food = await systemCategoryId(u.agent, "food");
    expect((await patch(u.agent, `/api/v1/categories/${food}`, { name: "Mine" })).status).toBe(404);
    expect((await del(u.agent, `/api/v1/categories/${food}`)).status).toBe(404);
  });
});

describe("custom categories", () => {
  it("creates, renames and deletes, keeping transactions as uncategorised", async () => {
    const u = await registerUser();
    const cat = (await post(u.agent, "/api/v1/categories", { name: "Pet care", kind: "EXPENSE", color: "#123456" })).body.category;
    expect(cat).toMatchObject({ name: "Pet care", isSystem: false, color: "#123456" });
    expect((await post(u.agent, "/api/v1/categories", { name: "pet care", kind: "EXPENSE" })).status).toBe(409);

    const renamed = await patch(u.agent, `/api/v1/categories/${cat.id}`, { name: "Pets" });
    expect(renamed.body.category).toMatchObject({ name: "Pets", color: "#123456" });

    const tx = (await post(u.agent, "/api/v1/transactions", { ...base, categoryId: cat.id })).body.transaction;
    expect((await del(u.agent, `/api/v1/categories/${cat.id}`)).status).toBe(204);
    const after = await u.agent.get(`/api/v1/transactions/${tx.id}`);
    expect(after.body.transaction.categoryId).toBeNull();
  });
});
