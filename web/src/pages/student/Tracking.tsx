import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../../api/client";
import { studentApi } from "../../api/endpoints";
import { ErrorBanner, StatusBadge } from "../../components/Ui";
import { OsmMap } from "../../maps/OsmMap";
import type { Stop, TrackingResponse } from "../../types";

export default function StudentTracking() {
  const [params] = useSearchParams();
  const busId = Number(params.get("busId"));
  const stopId = Number(params.get("stopId"));
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!busId) return;
    let active = true;
    const refreshTracking = () => studentApi.tracking(busId)
      .then((snapshot) => { if (active) { setTracking(snapshot); setError(null); } })
      .catch((err) => { if (active) setError(getErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    refreshTracking();
    studentApi.stops(busId).then((busStops) => { if (active) setStops(busStops); })
      .catch((err) => { if (active) setError(getErrorMessage(err)); });
    const timer = window.setInterval(refreshTracking, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [busId]);

  const selected = useMemo(() => stops.find((stop) => stop.id === stopId), [stops, stopId]);
  if (!busId) return <p>Select a bus from the student dashboard first.</p>;

  const distance = tracking?.distanceToSelectedStop;
  const reached = distance != null && distance <= 0.1;

  return (
    <div className="tracking-page">
      <header className="tracking-header">
        <div>
          <span className="eyebrow">CAMPUS TRANSIT · LIVE</span>
          <h2>Track your bus</h2>
          <p>Live distance and arrival estimate to your selected stop.</p>
        </div>
        {tracking && <StatusBadge status={tracking.status} />}
      </header>
      <ErrorBanner message={error} />
      <div className="tracking-destination">
        <span>Your bus</span><strong>{tracking?.busNumber ?? `Bus ${busId}`}</strong>
        <span className="tracking-destination__divider" aria-hidden="true">→</span>
        <span>Your stop</span><strong>{selected?.stopName ?? "Selected stop"}</strong>
      </div>
      {loading && !tracking ? <div className="empty">Getting the latest bus location…</div> : (
        <div className="tracking-metrics">
          <article className="tracking-metric"><span>Distance to your stop</span><strong>{distance == null ? "—" : `${distance.toFixed(2)} km`}</strong><small>{reached ? "Bus is within 100 m" : "From the latest GPS location"}</small></article>
          <article className="tracking-metric"><span>Estimated arrival</span><strong>{reached ? "Here" : tracking?.etaMinutes == null ? "—" : `${tracking.etaMinutes} min`}</strong><small>{reached ? "Your bus is at the stop" : "Based on current speed"}</small></article>
          <article className="tracking-metric"><span>Current speed</span><strong>{tracking?.speed == null ? "—" : `${tracking.speed.toFixed(1)} km/h`}</strong><small>Calculated from recent GPS points</small></article>
          <article className="tracking-metric"><span>Next route stop</span><strong>{tracking?.nextStop ?? "—"}</strong><small>{tracking?.currentStop ? `At ${tracking.currentStop}` : "Following the active route"}</small></article>
        </div>
      )}
      <div className="tracking-map-heading">
        <div><h3>Bus location</h3><p className="muted">{tracking?.lastUpdated ? `Updated ${new Date(tracking.lastUpdated).toLocaleTimeString()}` : "Waiting for the driver to share GPS"}</p></div>
        <span className="tracking-refresh"><i /> Updates every 5 seconds</span>
      </div>
      <OsmMap tracking={tracking} stops={stops} selectedStopId={stopId} selectedBusId={busId} followBus />
    </div>
  );
}
