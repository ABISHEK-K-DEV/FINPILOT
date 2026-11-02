import { Link } from "react-router-dom";

export function Logo({ to = "/", light = false }: { to?: string; light?: boolean }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2" aria-label="FinPilot home">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? "#ffffff" : "#0F1E3D"} />
        <path d="M9 21.5 15 10l3.2 6.2L21 13l2 8.5" fill="none" stroke="#3B82F6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-lg font-semibold tracking-tight ${light ? "text-white" : "text-ink"}`}>FinPilot</span>
    </Link>
  );
}
