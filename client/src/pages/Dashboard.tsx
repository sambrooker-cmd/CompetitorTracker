import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Alert, type Competitor } from "../api";
import AlertBadge from "../components/AlertBadge";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  async function load() {
    setLoading(true);
    const [alertsRes, competitorsRes] = await Promise.all([
      api.get<Alert[]>("/alerts"),
      api.get<Competitor[]>("/competitors"),
    ]);
    setAlerts(alertsRes.data);
    setCompetitors(competitorsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runScrapeNow() {
    setScraping(true);
    try {
      await api.post("/scrape/run");
      await load();
    } finally {
      setScraping(false);
    }
  }

  const productCount = competitors.reduce((sum, c) => sum + c.products.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Competitors" value={competitors.length} />
        <StatCard label="Tracked products" value={productCount} />
        <StatCard label="Recent alerts" value={alerts.length} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Recent alerts</h2>
        <button
          onClick={runScrapeNow}
          disabled={scraping}
          className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {scraping ? "Scraping..." : "Scrape now"}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : alerts.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No alerts yet. Add a competitor and product, then run a scrape.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
          {alerts.map((a, i) => (
            <li key={i} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertBadge type={a.type} />
                  <Link to={`/products/${a.productId}`} className="font-medium hover:underline truncate">
                    {a.productName}
                  </Link>
                  <span className="text-slate-400 text-sm">· {a.competitorName}</span>
                </div>
                <p className="text-sm text-slate-600 truncate">{a.detail}</p>
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(a.scrapedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
