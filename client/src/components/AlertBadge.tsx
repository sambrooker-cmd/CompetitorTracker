import type { Alert } from "../api";

const styles: Record<Alert["type"], string> = {
  price_drop: "bg-emerald-100 text-emerald-800",
  price_increase: "bg-amber-100 text-amber-800",
  new_promo: "bg-indigo-100 text-indigo-800",
  promo_ended: "bg-slate-200 text-slate-700",
  scrape_error: "bg-red-100 text-red-800",
  new_offer: "bg-indigo-100 text-indigo-800",
  offer_ended: "bg-slate-200 text-slate-700",
};

const labels: Record<Alert["type"], string> = {
  price_drop: "Price drop",
  price_increase: "Price increase",
  new_promo: "New promotion",
  promo_ended: "Promotion ended",
  scrape_error: "Scrape error",
  new_offer: "New offer",
  offer_ended: "Offer ended",
};

export default function AlertBadge({ type }: { type: Alert["type"] }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}
