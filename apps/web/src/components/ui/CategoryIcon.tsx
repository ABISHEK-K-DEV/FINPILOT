import {
  Briefcase, Car, Circle, Film, Gift, GraduationCap, HeartPulse, Home, Laptop, Plane, Receipt, RotateCcw,
  Shield, ShoppingBag, TrendingUp, Utensils, Wallet, Zap, HelpCircle, type LucideIcon,
} from "lucide-react";
import type { CategoryDTO, CategoryIcon as IconName } from "@finpilot/shared";

const ICONS: Record<IconName, LucideIcon> = {
  utensils: Utensils, "shopping-bag": ShoppingBag, plane: Plane, car: Car, film: Film, zap: Zap,
  "graduation-cap": GraduationCap, "heart-pulse": HeartPulse, home: Home, receipt: Receipt, shield: Shield,
  gift: Gift, briefcase: Briefcase, laptop: Laptop, "trending-up": TrendingUp, "rotate-ccw": RotateCcw,
  wallet: Wallet, circle: Circle,
};

export function CategoryIcon({ category, size = "md" }: { category?: CategoryDTO | null; size?: "sm" | "md" }) {
  const Icon = category ? (ICONS[category.icon] ?? Circle) : HelpCircle;
  const color = category?.color ?? "#94A3B8";
  const box = size === "sm" ? "size-7" : "size-9";
  return (
    <span className={`inline-flex ${box} shrink-0 items-center justify-center rounded-xl`} style={{ backgroundColor: `${color}1A`, color }} aria-hidden>
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </span>
  );
}
