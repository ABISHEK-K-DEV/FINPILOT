import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { TransactionDTO } from "@finpilot/shared";
import { TransactionFormModal } from "./TransactionForm";

interface EditorCtx {
  openNew: (type?: "EXPENSE" | "INCOME") => void;
  openEdit: (tx: TransactionDTO) => void;
}
const Ctx = createContext<EditorCtx | null>(null);

/** One shared add/edit dialog, reachable from anywhere (header button, mobile FAB, lists). */
export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; tx: TransactionDTO | null; type: "EXPENSE" | "INCOME" }>({
    open: false,
    tx: null,
    type: "EXPENSE",
  });
  const openNew = useCallback((type: "EXPENSE" | "INCOME" = "EXPENSE") => setState({ open: true, tx: null, type }), []);
  const openEdit = useCallback((tx: TransactionDTO) => setState({ open: true, tx, type: tx.type === "INCOME" ? "INCOME" : "EXPENSE" }), []);
  return (
    <Ctx.Provider value={{ openNew, openEdit }}>
      {children}
      <TransactionFormModal
        key={state.open ? (state.tx?.id ?? `new-${state.type}`) : "closed"}
        open={state.open}
        transaction={state.tx}
        initialType={state.type}
        onClose={() => setState((s) => ({ ...s, open: false }))}
      />
    </Ctx.Provider>
  );
}

export function useTransactionEditor(): EditorCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTransactionEditor outside provider");
  return c;
}
