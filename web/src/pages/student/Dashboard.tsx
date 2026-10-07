import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../api/client";
import { studentApi } from "../../api/endpoints";
import { ErrorBanner } from "../../components/Ui";
import { OsmMap } from "../../maps/OsmMap";
import { useBusLocation } from "../../hooks/useBusLocation";
import type { Bus, Route, Stop, TrackingResponse } from "../../types";
import "./student-dashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [newStop, setNewStop] = useState<{ stopName: string; latitude: number; longitude: number } | null>(null);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [stopId, setStopId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [followBus, setFollowBus] = useState(true);
  const [liveLocation, setLiveLocation] = useState<TrackingResponse | null>(null);

  useEffect(() => {
    studentApi.buses().then(setBuses).catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    setStops([]);
    setRoutes([]);
    setRouteId(null);
    setNewStop(null);
    setStopId(null);
    setLiveLocation(null);
    if (!selectedBus) return;

    let cancelled = false;
    setStopsLoading(true);
    studentApi.routes(selectedBus.id).then((items) => {
      if (!cancelled) {
        setRoutes(items);
        setRouteId(items[0]?.id ?? null);
        setStops(items[0]?.stops ?? []);
        setStopsLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(getErrorMessage(err));
        setStopsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedBus?.id]);

  const routeStops = routes.find((route) => route.id === routeId)?.stops ?? stops;

  async function createStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!routeId || !newStop?.stopName.trim()) return;
    try {
      await studentApi.requestStop(routeId, { ...newStop, stopName: newStop.stopName.trim() });
      setNewStop(null);
      setSuggestionMessage("Stop suggestion sent to an administrator for approval.");
      setError(null);
    } catch (err) { setError(getErrorMessage(err)); }
  }

  const onLocationUpdate = useCallback((payload: TrackingResponse) => {
    setLiveLocation(payload);
    setBuses((currentBuses) => currentBuses.map((bus) =>
      bus.id === payload.busId
        ? {
            ...bus,
            currentLat: payload.latitude,
            currentLng: payload.longitude,
            currentSpeed: payload.speed,
            lastUpdated: payload.lastUpdated,
            status: payload.status,
          }
        : bus
    ));
  }, []);

  useBusLocation(selectedBus?.id ?? null, onLocationUpdate);

  const selectedBusData = buses.find((bus) => bus.id === selectedBus?.id) ?? null;

  function chooseBus(bus: Bus) {
    if (bus.id !== selectedBus?.id) {
      setError(null);
      setStopId(null);
      setSuggestionMessage(null);
      setSelectedBus(bus);
    }
  }

  async function confirm() {
    if (!selectedBus || stopId === null) return;
    setLoading(true);
    try {
      await studentApi.selectStop(selectedBus.id, stopId);
      navigate(`/student/tracking?busId=${selectedBus.id}&stopId=${stopId}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="student-dashboard">
      <header className="student-dashboard__header">
        <div>
          <span className="student-dashboard__eyebrow">CAMPUS TRANSIT</span>
          <h2>Find your bus</h2>
        </div>
        <span className="student-dashboard__route-count">{buses.length} buses available</span>
      </header>
      <ErrorBanner message={error} />
      <div className="student-dashboard__workspace">
        <aside className="student-dashboard__panel">
          <section className="student-dashboard__section">
            <div className="student-dashboard__section-heading">
              <h3>Choose a bus</h3>
              <span>{buses.length}</span>
            </div>
            <input
              className="student-dashboard__search"
              aria-label="Search buses"
              placeholder="Search bus or driver"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="student-dashboard__bus-list">
              {buses
                .filter((bus) => `${bus.busNumber} ${bus.driverName ?? ""}`.toLowerCase().includes(query.toLowerCase()))
                .map((bus) => {
                  const displayStatus = bus.status === "ACTIVE" ? "RUNNING" : bus.status;
                  return (
                    <button
                      key={bus.id}
                      type="button"
                      className={`student-bus-card${selectedBus?.id === bus.id ? " is-selected" : ""}`}
                      aria-pressed={selectedBus?.id === bus.id}
                      onClick={() => chooseBus(bus)}
                    >
                      <span className="student-bus-card__number">{bus.busNumber}</span>
                      <span className="student-bus-card__driver">{bus.driverName ?? "No driver assigned"}</span>
                      <span className={`student-bus-card__status ${displayStatus.toLowerCase()}`}>{displayStatus}</span>
                    </button>
                  );
                })}
              {buses.length === 0 && <p className="student-dashboard__empty">No buses available.</p>}
              {buses.length > 0 && !buses.some((bus) => `${bus.busNumber} ${bus.driverName ?? ""}`.toLowerCase().includes(query.toLowerCase())) && (
                <p className="student-dashboard__empty">No buses match that search.</p>
              )}
            </div>
          </section>

          <section className="student-dashboard__section student-dashboard__stops">
            <div className="student-dashboard__section-heading">
              <h3>Choose your pickup stop</h3>
              {selectedBus && <span>{routeStops.length}</span>}
            </div>
            {!selectedBus && <p className="student-dashboard__empty">Select a bus first</p>}
            {selectedBus && routes.length > 0 && <label>Route
              <select value={routeId ?? ""} onChange={(event) => {
                const nextRouteId = Number(event.target.value);
                setRouteId(nextRouteId);
                setStops(routes.find((route) => route.id === nextRouteId)?.stops ?? []);
                setStopId(null);
                setNewStop(null);
                setSuggestionMessage(null);
              }}>
                {routes.map((route) => <option key={route.id} value={route.id}>{route.routeName}</option>)}
              </select>
            </label>}
            {selectedBus && stopsLoading && <p className="student-dashboard__empty">Loading stops...</p>}
            {selectedBus && !stopsLoading && routeStops.length === 0 && (
              <p className="student-dashboard__empty">No stops are available for this bus.</p>
            )}
            {selectedBus && !stopsLoading && routeStops.length > 0 && (
              <>
              <p className="student-dashboard__map-hint">Tap a stop on the map or choose it from this list.</p>
              <div className="student-dashboard__stop-chips">
                {routeStops.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((stop) => (
                  <button
                    key={stop.id}
                    type="button"
                    className={`student-stop-chip${stopId === stop.id ? " is-selected" : ""}`}
                    aria-pressed={stopId === stop.id}
                    onClick={() => setStopId(stop.id)}
                  >
                    <span>{stop.sequenceOrder}</span>{stop.stopName}
                  </button>
                ))}
              </div>
              </>
            )}
            {selectedBus && routeId && <form className="route-form" onSubmit={createStop}>
              <strong>Need a pickup stop?</strong>
              <p className="muted">Click the map to place a pin, enter its name, and send it to an administrator for approval.</p>
              {suggestionMessage && <p className="muted" role="status">{suggestionMessage}</p>}
              {newStop && <>
                <label>Stop name<input required maxLength={120} value={newStop.stopName} onChange={(event) => setNewStop({ ...newStop, stopName: event.target.value })} /></label>
                <p className="muted">A nearby map name is suggested automatically. You can edit it or enter your own stop name.</p>
                <button type="submit">Request stop approval</button>
              </>}
            </form>}
          </section>

          <label className="student-dashboard__follow">
            <input type="checkbox" checked={followBus} onChange={(event) => setFollowBus(event.target.checked)} />
            <span>Follow bus</span>
          </label>
          <button
            className="student-dashboard__confirm"
            type="button"
            disabled={!selectedBus || stopId === null || loading}
            onClick={confirm}
          >
            {loading ? "Confirming..." : "Confirm & Track"}
            <span aria-hidden="true">&#8594;</span>
          </button>
        </aside>

        <section className="student-dashboard__map" aria-label="Bus route map">
          <OsmMap
            buses={buses}
            tracking={liveLocation}
            stops={routeStops}
            fitStops
            selectedStopId={stopId}
            selectedBusId={selectedBus?.id ?? null}
            followBus={followBus}
            showStopPopups={false}
            onStopClick={setStopId}
            onMapClick={routeId ? (latitude, longitude, suggestedName, source) => {
              setNewStop((current) => {
                if (!suggestedName) return { stopName: "", latitude, longitude };
                if (current && Math.abs(current.latitude - latitude) < 0.00001 && Math.abs(current.longitude - longitude) < 0.00001) {
                  return { ...current, stopName: current.stopName || suggestedName };
                }
                if (source === "map") return current;
                return { stopName: suggestedName, latitude, longitude };
              });
            } : undefined}
            draftPin={newStop}
            height="100%"
          />
          <div className="student-dashboard__map-caption">
            {selectedBusData ? `Bus ${selectedBusData.busNumber}` : "Campus area"}
            {selectedBusData?.status === "ACTIVE" ? " · Live route" : " · Route preview"}
          </div>
        </section>
      </div>
    </div>
  );
}
