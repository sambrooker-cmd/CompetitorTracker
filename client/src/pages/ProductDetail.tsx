import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, type PriceEntry, type Product } from "../api";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product & { competitor: { name: string } }>();
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  async function load() {
    setLoading(true);
    const [productRes, historyRes] = await Promise.all([
      api.get(`/products/${id}`),
      api.get<PriceEntry[]>(`/products/${id}/history`),
    ]);
    setProduct(productRes.data);
    setHistory(historyRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function scrapeNow() {
    setScraping(true);
    try {
      await api.post(`/products/${id}/scrape`);
      await load();
    } finally {
      setScraping(false);
    }
  }

  if (loading || !product) return <p className="text-slate-500 text-sm">Loading...</p>;

  const chartData = history
    .filter((h) => h.price != null)
    .map((h) => ({ date: new Date(h.scrapedAt).toLocaleDateString(), price: h.price }));

  const promoEntries = history.filter((h) => h.promoText).slice().reverse();

  return (
    <div className="space-y-6">
      <div>
        <Link to="/competitors" className="text-sm text-indigo-600 hover:underline">
          ← Back to competitors
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-sm text-slate-500">
              {product.competitor.name} ·{" "}
              <a href={product.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                view page
              </a>
            </p>
          </div>
          <button onClick={scrapeNow} disabled={scraping} className="btn-primary">
            {scraping ? "Scraping..." : "Scrape now"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold mb-3">Price history ({product.currency})</h3>
        {chartData.length === 0 ? (
          <p className="text-slate-500 text-sm">No successful price scrapes yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold mb-3">Promotions seen</h3>
        {promoEntries.length === 0 ? (
          <p className="text-slate-500 text-sm">No promotions detected yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {promoEntries.map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-sm">{p.promoText}</span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(p.scrapedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold mb-3">Raw scrape log</h3>
        <ul className="divide-y divide-slate-100 text-sm max-h-64 overflow-y-auto">
          {history
            .slice()
            .reverse()
            .map((h) => (
              <li key={h.id} className="py-2 flex items-center justify-between gap-3">
                <span className={h.error ? "text-red-600" : ""}>
                  {h.error ? `Error: ${h.error}` : `${h.rawPrice ?? "—"}${h.promoText ? ` · ${h.promoText}` : ""}`}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(h.scrapedAt).toLocaleString()}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
