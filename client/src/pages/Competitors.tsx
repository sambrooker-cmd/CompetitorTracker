import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, TIER_LABELS, type Competitor, type CompetitorTier, type Offer } from "../api";

const TIER_ORDER: CompetitorTier[] = ["direct", "international", "trade"];

const tierBadgeClass: Record<CompetitorTier, string> = {
  direct: "bg-indigo-100 text-indigo-800",
  international: "bg-sky-100 text-sky-800",
  trade: "bg-amber-100 text-amber-800",
};

export default function Competitors() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [offersByCompetitor, setOffersByCompetitor] = useState<Record<number, Offer[]>>({});
  const [loading, setLoading] = useState(true);
  const [addingSailingFor, setAddingSailingFor] = useState<number | null>(null);
  const [editingOffersFor, setEditingOffersFor] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get<Competitor[]>("/competitors");
    setCompetitors(res.data);
    const offerEntries = await Promise.all(
      res.data.map(async (c) => [c.id, (await api.get<Offer[]>(`/offers/competitor/${c.id}`)).data] as const)
    );
    setOffersByCompetitor(Object.fromEntries(offerEntries));
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
      tier: data.get("tier"),
      parentGroup: data.get("parentGroup") || undefined,
    });
    form.reset();
    await load();
  }

  async function deleteCompetitor(id: number) {
    if (!confirm("Delete this competitor and all its tracked sailings/offers?")) return;
    await api.delete(`/competitors/${id}`);
    await load();
  }

  async function saveOfferConfig(e: FormEvent<HTMLFormElement>, competitorId: number) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await api.patch(`/competitors/${competitorId}`, {
      offersUrl: data.get("offersUrl") || null,
      offerSelector: data.get("offerSelector") || null,
      renderMode: data.get("renderMode") || "static",
    });
    setEditingOffersFor(null);
    await load();
  }

  async function addSailing(e: FormEvent<HTMLFormElement>, competitorId: number) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await api.post(`/competitors/${competitorId}/products`, {
      name: data.get("name"),
      url: data.get("url"),
      priceSelector: data.get("priceSelector"),
      promoSelector: data.get("promoSelector") || undefined,
      currency: data.get("currency") || "GBP",
      routeType: data.get("routeType") || undefined,
      destination: data.get("destination") || undefined,
      nights: data.get("nights") || undefined,
      cabinType: data.get("cabinType") || undefined,
      renderMode: data.get("renderMode") || "static",
    });
    form.reset();
    setAddingSailingFor(null);
    await load();
  }

  async function deleteSailing(id: number) {
    if (!confirm("Stop tracking this sailing?")) return;
    await api.delete(`/products/${id}`);
    await load();
  }

  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    competitors: competitors.filter((c) => c.tier === tier),
  })).filter((g) => g.competitors.length > 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-base font-semibold mb-3">Add a competitor</h2>
        <form onSubmit={addCompetitor} className="flex flex-wrap gap-2">
          <input name="name" required placeholder="Competitor name" className="input flex-1 min-w-[160px]" />
          <input name="website" required placeholder="https://competitor.com" className="input flex-1 min-w-[200px]" />
          <select name="tier" required className="input" defaultValue="direct">
            <option value="direct">Direct (product/size peer)</option>
            <option value="international">International (bigger line)</option>
            <option value="trade">Trade agent</option>
          </select>
          <input name="parentGroup" placeholder="Parent group (optional)" className="input flex-1 min-w-[160px]" />
          <button className="btn-primary">Add</button>
        </form>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.tier}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {TIER_LABELS[group.tier]}s ({group.competitors.length})
              </h2>
              <div className="space-y-4">
                {group.competitors.map((c) => {
                  const offers = offersByCompetitor[c.id] ?? [];
                  const activeOffers = offers.filter((o) => o.active);
                  return (
                    <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{c.name}</h3>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tierBadgeClass[c.tier]}`}>
                              {TIER_LABELS[c.tier]}
                            </span>
                            {c.parentGroup && <span className="text-xs text-slate-400">{c.parentGroup}</span>}
                          </div>
                          <a href={c.website} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                            {c.website}
                          </a>
                          {c.notes && <p className="text-sm text-slate-500 mt-1">{c.notes}</p>}
                        </div>
                        <div className="flex gap-2 whitespace-nowrap">
                          <button
                            onClick={() => setEditingOffersFor(editingOffersFor === c.id ? null : c.id)}
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            Offer tracking
                          </button>
                          <button
                            onClick={() => setAddingSailingFor(addingSailingFor === c.id ? null : c.id)}
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            + Track sailing
                          </button>
                          <button onClick={() => deleteCompetitor(c.id)} className="text-sm text-red-600 hover:underline">
                            Delete
                          </button>
                        </div>
                      </div>

                      {activeOffers.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Current offers</p>
                          <ul className="space-y-1">
                            {activeOffers.map((o) => (
                              <li key={o.id} className="text-sm">
                                {o.title}
                                {o.whileStocksLast && <span className="text-slate-400"> · while stocks last</span>}
                                {o.validUntil && (
                                  <span className="text-slate-400"> · ends {new Date(o.validUntil).toLocaleDateString()}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!c.offersUrl && (
                        <p className="mt-3 text-xs text-slate-400">
                          Offer tracking not configured yet — click "Offer tracking" to add the offers page URL and a
                          CSS selector.
                        </p>
                      )}

                      {c.products.length > 0 && (
                        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-1">
                          {c.products.map((p) => (
                            <li key={p.id} className="py-2 flex items-center justify-between gap-3">
                              <Link to={`/products/${p.id}`} className="hover:underline truncate">
                                {p.name}
                              </Link>
                              <button onClick={() => deleteSailing(p.id)} className="text-xs text-red-600 hover:underline">
                                remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {editingOffersFor === c.id && (
                        <form onSubmit={(e) => saveOfferConfig(e, c.id)} className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                          <input
                            name="offersUrl"
                            defaultValue={c.offersUrl ?? ""}
                            placeholder="Offers/promotions page URL"
                            className="input w-full"
                          />
                          <input
                            name="offerSelector"
                            defaultValue={c.offerSelector ?? ""}
                            placeholder="CSS selector matching each offer element (e.g. .promo-banner)"
                            className="input w-full"
                          />
                          <select name="renderMode" defaultValue={c.renderMode} className="input w-full">
                            <option value="static">Static HTML (fast, works for most sites)</option>
                            <option value="js">JavaScript-rendered (headless browser — needs Playwright installed)</option>
                          </select>
                          <button className="btn-primary">Save offer tracking</button>
                        </form>
                      )}

                      {addingSailingFor === c.id && (
                        <form onSubmit={(e) => addSailing(e, c.id)} className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                          <input name="name" required placeholder="Sailing label (e.g. 7-night Norwegian Fjords, Balcony)" className="input w-full" />
                          <input name="url" required placeholder="Sailing/booking page URL" className="input w-full" />
                          <input name="priceSelector" required placeholder="CSS selector for price" className="input w-full" />
                          <input name="promoSelector" placeholder="CSS selector for promo text (optional)" className="input w-full" />
                          <div className="grid grid-cols-2 gap-2">
                            <select name="routeType" className="input" defaultValue="ex_uk">
                              <option value="ex_uk">Ex-UK (no-fly)</option>
                              <option value="fly_caribbean">Fly-Caribbean</option>
                            </select>
                            <select name="cabinType" className="input" defaultValue="balcony">
                              <option value="inside">Inside</option>
                              <option value="oceanview">Oceanview</option>
                              <option value="balcony">Balcony</option>
                              <option value="suite">Suite</option>
                            </select>
                            <input name="destination" placeholder="Destination (e.g. Norwegian Fjords)" className="input" />
                            <input name="nights" type="number" min="1" placeholder="Nights" className="input" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input name="currency" placeholder="Currency (default GBP)" className="input" />
                            <select name="renderMode" className="input" defaultValue="static">
                              <option value="static">Static HTML</option>
                              <option value="js">JavaScript-rendered</option>
                            </select>
                          </div>
                          <button className="btn-primary">Save sailing</button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
