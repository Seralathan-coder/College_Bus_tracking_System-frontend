import { useEffect, useState } from "react";
import { getErrorMessage } from "../../api/client";
import { adminApi } from "../../api/endpoints";
import { ErrorBanner, EmptyState, StatusBadge } from "../../components/Ui";
import { OsmMap, type StopSnapDistance } from "../../maps/OsmMap";
import type { Route, Stop, StopSuggestion } from "../../types";
import "./routes.css";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StopSuggestion[]>([]);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [editingStops, setEditingStops] = useState<Stop[]>([]);
  const [savingLocations, setSavingLocations] = useState(false);
  const [snapDistances, setSnapDistances] = useState<StopSnapDistance[]>([]);

  useEffect(() => {
    adminApi.routes().then(setRoutes).catch((err) => setError(getErrorMessage(err)));
    adminApi.stopSuggestions().then(setSuggestions).catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function reviewSuggestion(id: number, approve: boolean) {
    setReviewingId(id);
    setError(null);
    try {
      if (approve) await adminApi.approveStopSuggestion(id);
      else await adminApi.rejectStopSuggestion(id);
      setSuggestions((current) => current.filter((item) => item.id !== id));
      if (approve) setRoutes(await adminApi.routes());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReviewingId(null);
    }
  }

  function editLocations(route: Route) {
    setEditingRouteId(route.id);
    setEditingStops(route.stops.map((stop) => ({ ...stop })));
    setError(null);
    setSnapDistances([]);
  }

  async function saveLocations() {
    if (editingRouteId === null) return;
    setSavingLocations(true);
    setError(null);
    try {
      await Promise.all(editingStops.map((stop) =>
        adminApi.updateRouteStopLocation(editingRouteId, stop.id, stop.latitude, stop.longitude),
      ));
      setRoutes(await adminApi.routes());
      setEditingRouteId(null);
      setEditingStops([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingLocations(false);
    }
  }

  return (
    <main className="admin-routes">
      <header className="admin-routes__hero">
        <div><span className="admin-routes__eyebrow">CAMPUS TRANSIT · ROUTE MANAGEMENT</span>
          <h2>Routes &amp; stops</h2>
          <p>Review student requests and keep every approved stop aligned with the road.</p>
        </div>
        <div className="admin-routes__stat"><strong>{routes.length}</strong><span>routes</span></div>
      </header>
      <ErrorBanner message={error} />

      <section className="admin-routes__section">
        <div className="admin-routes__section-heading"><div><span className="admin-routes__eyebrow">NEEDS REVIEW</span><h3>Student stop requests</h3></div><span className="admin-routes__count">{suggestions.length} pending</span></div>
        {suggestions.length === 0 ? <EmptyState text="No stop suggestions waiting for approval." /> : (
          <div className="admin-routes__suggestions">{suggestions.map((suggestion) => (
            <article className="admin-routes__suggestion" key={suggestion.id}>
              <div className="admin-routes__suggestion-pin">＋</div>
              <div className="admin-routes__suggestion-info"><h4>{suggestion.stopName}</h4><p>{suggestion.routeName} · Bus {suggestion.busNumber}</p><small>Requested by {suggestion.studentName} · {suggestion.latitude.toFixed(5)}, {suggestion.longitude.toFixed(5)}</small></div>
              <div className="admin-routes__actions"><button type="button" disabled={reviewingId !== null} onClick={() => reviewSuggestion(suggestion.id, true)}>{reviewingId === suggestion.id ? "Saving…" : "Approve"}</button><button type="button" className="secondary" disabled={reviewingId !== null} onClick={() => reviewSuggestion(suggestion.id, false)}>Decline</button></div>
            </article>
          ))}</div>
        )}
      </section>

      <section className="admin-routes__section">
        <div className="admin-routes__section-heading"><div><span className="admin-routes__eyebrow">LIVE ROUTE SETUP</span><h3>Saved routes</h3></div></div>
        {routes.length === 0 ? <EmptyState text="No routes created yet." /> : routes.map((route) => (
          <article className="admin-routes__route" key={route.id}>
            <div className="admin-routes__route-heading"><div><h3>{route.routeName}</h3><p>Bus {route.busNumber} <span>·</span> Driver {route.driverName}</p></div><StatusBadge status={route.status} /></div>
            {editingRouteId === route.id ? (
              <div className="admin-routes__editor">
                <div className="admin-routes__hint"><strong>Correct stop positions</strong><span>Drag the numbered pins onto their road, then save. The route follows the numbered stop order.</span></div>
                <OsmMap stops={editingStops} fitStops height="min(58vh, 520px)" onSnapDistances={setSnapDistances} onStopMove={(stopId, latitude, longitude) => setEditingStops((items) => items.map((stop) => stop.id === stopId ? { ...stop, latitude, longitude } : stop))} />
                {snapDistances.length > 0 && <div className="admin-routes__snap-warning"><strong>{snapDistances.length} stop{snapDistances.length === 1 ? " is" : "s are"} away from the mapped road</strong><ul>{snapDistances.map((item) => <li key={item.stopId}><span>{item.stopName}</span><b>{item.distanceMeters >= 1000 ? `${(item.distanceMeters / 1000).toFixed(2)} km` : `${Math.round(item.distanceMeters)} m`}</b></li>)}</ul><small>Move these numbered pins onto the road. Orange dashed lines show the gap to the nearest drivable road.</small></div>}
                <ol className="admin-routes__stop-list">{editingStops.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((stop) => <li key={stop.id}><b>{String(stop.sequenceOrder).padStart(2, "0")}</b><span>{stop.stopName}</span><small>{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</small></li>)}</ol>
                <div className="admin-routes__actions"><button type="button" className="secondary" disabled={savingLocations} onClick={() => setEditingRouteId(null)}>Cancel</button><button type="button" disabled={savingLocations} onClick={saveLocations}>{savingLocations ? "Saving pins…" : "Save stop locations"}</button></div>
              </div>
            ) : (
              <>
                <ol className="admin-routes__stop-list">{route.stops.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((stop) => <li key={stop.id}><b>{String(stop.sequenceOrder).padStart(2, "0")}</b><span>{stop.stopName}</span><small>{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</small></li>)}</ol>
                <button type="button" className="admin-routes__edit-button" onClick={() => editLocations(route)}>Adjust stop pins on map <span aria-hidden="true">↗</span></button>
              </>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
