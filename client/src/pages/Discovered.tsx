import { useEffect, useState } from "react";
import { api, type DiscoveredSailing } from "../api";

export default function Discovered() {
  const [sailings, setSailings] = useState<DiscoveredSailing[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const res = await api.get<DiscoveredSailing[]>("/discovered-sailings");
    setSailings(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runDiscovery() {
    setRunning(true);
    try {
      await api.post("/discovered-sailings/run");
      await load();
    } finally {
      setRunning(false);
    }
  }

  async function approve(id: number) {
    setBusyId(id);
    try {
      await api.post(`/discovered-sailings/${id}/approve`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    try {
      await api.post(`/discovered-sailings/${id}/reject`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Discovered sailings</h2>
          <p className="text-sm text-slate-500">
            Cruises found on competitor listing pages that match one of Ambassador's own routes. Nothing here becomes
            a tracked sailing until you approve it.
          </p>
        </div>
        <button onClick={runDiscovery} disabled={running} className="btn-primary whitespace-nowrap">
          {running ? "Running..." : "Run discovery now"}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : sailings.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Nothing pending. Configure a competitor's listing page (via the API — see README) and Ambassador's own
          routes, then run discovery.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
          {sailings.map((s) => (
            <li key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{s.name}</span>
                  <span className="text-slate-400 text-sm">· {s.competitor.name}</span>
                  {s.routeType && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                      {s.routeType === "ex_uk" ? "Ex-UK" : "Fly-Caribbean"}
                    </span>
                  )}
                  {s.nights && <span className="text-slate-400 text-sm">{s.nights} nights</span>}
                </div>
                {s.matchedRoute && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    Matches Ambassador route: {s.matchedRoute.destination} ({s.matchedRoute.nightsMin}-
                    {s.matchedRoute.nightsMax} nights)
                  </p>
                )}
                <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline break-all">
                  {s.url}
                </a>
              </div>
              <div className="flex gap-2 whitespace-nowrap">
                <button
                  onClick={() => approve(s.id)}
                  disabled={busyId === s.id}
                  className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(s.id)}
                  disabled={busyId === s.id}
                  className="px-3 py-1.5 text-sm rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
