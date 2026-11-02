import { useParams, Link } from "react-router-dom";
import { Bot, CalendarDays, FileText, Repeat, ScanLine, ShieldPlus, type LucideIcon } from "lucide-react";
import { Card, PageHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Feedback";

const FEATURES: Record<string, { title: string; milestone: number; icon: LucideIcon; points: string[] }> = {
  scanner: { title: "Receipt & bill scanner", milestone: 2, icon: ScanLine, points: [
    "Upload receipts, utility bills, invoices and insurance documents (PDF, JPG, PNG).",
    "OCR + structured AI extraction of merchant, date, totals, tax, line items and due dates.",
    "You review and correct every extracted field before anything is saved.",
    "Files stored privately with per-user access; processing only with your Document Processing consent.",
  ] },
  bills: { title: "Bill analysis", milestone: 2, icon: FileText, points: [
    "Track electricity, broadband, mobile and insurance bills with due dates.",
    "Compare a bill with its own history: usage, fees and tax changes.",
    "Alternatives are shown only when reliable plan data and eligibility can be checked.",
  ] },
  subscriptions: { title: "Subscription manager", milestone: 3, icon: Repeat, points: [
    "Recurring charges detected from your records with explainable rules.",
    "Monthly and annual cost, next renewal date and recorded price changes.",
    "Official cancellation links and guidance — FinPilot never claims to cancel on your behalf.",
  ] },
  warranties: { title: "Warranty manager", milestone: 3, icon: ShieldPlus, points: [
    "Product, purchase price, seller, invoice reference and warranty expiry from your invoice.",
    "Reminders before warranties expire and for scheduled servicing.",
  ] },
  calendar: { title: "Financial calendar", milestone: 3, icon: CalendarDays, points: [
    "Bill due dates, subscription renewals, insurance renewals and EMIs you enter.",
    "Reminders by push notification and email — only if you opt in.",
  ] },
  assistant: { title: "AI financial assistant", milestone: 4, icon: Bot, points: [
    "Ask questions like “Which bills increased?” about your own records.",
    "Every answer shows the calculation and the transactions behind it, and says what data is missing.",
    "Opt-in only. Not investment advice, and it never promises returns.",
  ] },
};

export default function ComingSoonPage() {
  const { feature = "" } = useParams();
  const f = FEATURES[feature];
  if (!f) {
    return (
      <Card>
        <p className="text-sm">This page doesn't exist. <Link to="/app" className="text-accent">Back to dashboard</Link></p>
      </Card>
    );
  }
  return (
    <>
      <PageHeader title={f.title} description="Planned for an upcoming release." actions={<Badge tone="info">Milestone {f.milestone}</Badge>} />
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"><f.icon className="size-7" aria-hidden /></div>
          <div>
            <h2 className="font-semibold">What's coming</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-2">{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="mt-5 text-sm text-ink-3">Until this ships, nothing here is simulated — we'd rather show nothing than show numbers that aren't yours.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
