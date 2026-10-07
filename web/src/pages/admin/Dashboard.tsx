import { useEffect, useState } from "react";
import { getErrorMessage } from "../../api/client";
import { adminApi, studentApi } from "../../api/endpoints";
import { ErrorBanner, StatusBadge } from "../../components/Ui";
import { OsmMap } from "../../maps/OsmMap";
import type { Bus, DashboardStats } from "../../types";
import { subscribeToBus } from "../../websocket/stompClient";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selected, setSelected] = useState<Bus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.buses()])
      .then(([dashboard, list]) => {
        setStats(dashboard);
        setBuses(list);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    const unsubscribers = buses.map((bus) =>
      subscribeToBus(bus.id, (payload) => {
        setBuses((current) =>
          current.map((item) =>
            item.id === payload.busId
              ? {
                  ...item,
                  currentLat: payload.latitude,
                  currentLng: payload.longitude,
                  currentSpeed: payload.speed,
                  lastUpdated: payload.lastUpdated,
                  status: payload.status,
                }
              : item
          )
        );
        setSelected((current) =>
          current && current.id === payload.busId
            ? {
                ...current,
                currentLat: payload.latitude,
                currentLng: payload.longitude,
                currentSpeed: payload.speed,
                lastUpdated: payload.lastUpdated,
                status: payload.status,
              }
            : current
        );
      })
    );
    return () => unsubscribers.forEach((fn) => fn());
  }, [buses.map((b) => b.id).join(",")]);

  return (
    <div>
      <h2>Admin dashboard</h2>
      <ErrorBanner message={error} />
      {!stats ? (
        <p>Loading...</p>
      ) : (
        <div className="cards">
          <article className="card stat"><span>Total buses</span><strong>{stats.totalBuses}</strong></article>
          <article className="card stat"><span>Active buses</span><strong>{stats.activeBuses}</strong></article>
          <article className="card stat"><span>Offline buses</span><strong>{stats.offlineBuses}</strong></article>
          <article className="card stat"><span>Drivers</span><strong>{stats.drivers}</strong></article>
          <article className="card stat"><span>Students</span><strong>{stats.students}</strong></article>
          <article className="card stat"><span>Active trips</span><strong>{stats.activeTrips}</strong></article>
        </div>
      )}
      <h3>Live bus map</h3>
      <OsmMap buses={buses} onBusClick={setSelected} />
      {selected && (
        <div className="card">
          <h4>{selected.busNumber}</h4>
          <p>Driver: {selected.driverName ?? "Unassigned"}</p>
          <p>Status: <StatusBadge status={selected.status} /></p>
          <p>Speed: {selected.currentSpeed?.toFixed(1) ?? "—"} km/h</p>
          <LiveExtras busId={selected.id} />
        </div>
      )}
    </div>
  );
}

function LiveExtras({ busId }: { busId: number }) {
  const [nextStop, setNextStop] = useState("—");
  useEffect(() => {
    studentApi
      .stops(busId)
      .then((stops) => setNextStop(stops[0]?.stopName ?? "—"))
      .catch(() => setNextStop("—"));
  }, [busId]);
  return <p>Route start / next stop: {nextStop}</p>;
}
