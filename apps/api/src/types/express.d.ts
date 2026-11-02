import type { UserRole, PlanCode } from "@prisma/client";

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: UserRole;
  plan: PlanCode;
  email: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
