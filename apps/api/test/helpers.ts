import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";

export const app = createApp();
export const CLIENT_HEADER = { "X-FinPilot-Client": "test" };

export type Agent = ReturnType<typeof request.agent>;

export interface TestUser {
  agent: Agent;
  id: string;
  email: string;
  password: string;
}

export async function registerUser(overrides: Record<string, unknown> = {}): Promise<TestUser> {
  const agent = request.agent(app);
  const email = (overrides.email as string) ?? `user-${randomUUID()}@test.local`;
  const password = "correct-horse-42";
  const res = await agent
    .post("/api/v1/auth/register")
    .set(CLIENT_HEADER)
    .send({ name: "Test User", email, password, acceptTerms: true, acceptPrivacy: true, ...overrides });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, id: res.body.user.id, email, password };
}

export async function systemCategoryId(agent: Agent, slug: string): Promise<string> {
  const res = await agent.get("/api/v1/categories");
  const c = (res.body.items as { slug: string; id: string }[]).find((x) => x.slug === slug);
  if (!c) throw new Error(`category ${slug} missing`);
  return c.id;
}

export function post(agent: Agent, url: string, body: unknown) {
  return agent.post(url).set(CLIENT_HEADER).send(body as object);
}
export function patch(agent: Agent, url: string, body: unknown) {
  return agent.patch(url).set(CLIENT_HEADER).send(body as object);
}
export function del(agent: Agent, url: string, body?: unknown) {
  const r = agent.delete(url).set(CLIENT_HEADER);
  return body ? r.send(body as object) : r;
}
