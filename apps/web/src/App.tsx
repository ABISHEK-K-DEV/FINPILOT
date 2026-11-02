import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Spinner } from "./components/ui/Feedback";
import { AppLayout } from "./components/layout/AppLayout";
import { LandingPage } from "./pages/Landing";
import { LoginPage, RegisterPage } from "./pages/Auth";

const DashboardPage = lazy(() => import("./pages/Dashboard"));
const TransactionsPage = lazy(() => import("./pages/Transactions"));
const BudgetsPage = lazy(() => import("./pages/Budgets"));
const ReportsPage = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const AdminPage = lazy(() => import("./pages/Admin"));
const ComingSoonPage = lazy(() => import("./pages/ComingSoon"));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <Spinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null; // RequireAuth handles the signed-out redirect
  return user.role === "ADMIN" ? <>{children}</> : <Navigate to="/app" replace />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  return user ? <Navigate to="/app" replace /> : <>{children}</>;
}

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
          <Route path=":feature" element={<ComingSoonPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
