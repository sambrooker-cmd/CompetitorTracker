import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Competitor } from "../api";

export default function Competitors() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProductFor, setAddingProductFor] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get<Competitor[]>("/competitors");
    setCompetitors(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCompetitor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await api.post("/competitors", {
      name: data.get("name"),
      website: data.get("website"),
    });
    form.reset();
    await load();
  }

  async function deleteCompetitor(id: number) {
    if (!confirm("Delete this competitor and all its tracked products?")) return;
    await api.delete(`/competitors/${id}`);
    await load();
  }

  async function addProduct(e: FormEvent<HTMLFormElement>, competitorId: number) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await api.post(`/competitors/${competitorId}/products`, {
      name: data.get("name"),
      url: data.get("url"),
      priceSelector: data.get("priceSelector"),
      promoSelector: data.get("promoSelector") || undefined,
      currency: data.get("currency") || "USD",
    });
    form.reset();
    setAddingProductFor(null);
    await load();
  }

  async function deleteProduct(id: number) {
    if (!confirm("Stop tracking this product?")) return;
    await api.delete(`/products/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-base font-semibold mb-3">Add a competitor</h2>
        <form onSubmit={addCompetitor} className="flex flex-wrap gap-2">
          <input name="name" required placeholder="Competitor name" className="input flex-1 min-w-[160px]" />
          <input name="website" required placeholder="https://competitor.com" className="input flex-1 min-w-[200px]" />
          <button className="btn-primary">Add</button>
        </form>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="space-y-4">
          {competitors.map((c) => (
            <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <a href={c.website} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                    {c.website}
                  </a>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddingProductFor(addingProductFor === c.id ? null : c.id)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    + Track product
                  </button>
                  <button onClick={() => deleteCompetitor(c.id)} className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>

              {c.products.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100">
                  {c.products.map((p) => (
                    <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                      <Link to={`/products/${p.id}`} className="hover:underline truncate">
                        {p.name}
                      </Link>
                      <button onClick={() => deleteProduct(p.id)} className="text-xs text-red-600 hover:underline">
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {addingProductFor === c.id && (
                <form onSubmit={(e) => addProduct(e, c.id)} className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                  <input name="name" required placeholder="Product name" className="input w-full" />
                  <input name="url" required placeholder="Product page URL" className="input w-full" />
                  <input
                    name="priceSelector"
                    required
                    placeholder="CSS selector for price (e.g. .price, #product-price)"
                    className="input w-full"
                  />
                  <input
                    name="promoSelector"
                    placeholder="CSS selector for promo text (optional)"
                    className="input w-full"
                  />
                  <input name="currency" placeholder="Currency (default USD)" className="input w-full" />
                  <button className="btn-primary">Save product</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
