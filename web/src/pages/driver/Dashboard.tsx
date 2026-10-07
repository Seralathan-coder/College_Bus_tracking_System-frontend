import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../api/client";
import { driverApi } from "../../api/endpoints";
import { ErrorBanner, StatusBadge } from "../../components/Ui";
import { OsmMap } from "../../maps/OsmMap";
import type { Bus, Route, Trip } from "../../types";

type StopDraft = { stopName: string; latitude: string; longitude: string };
type EditableStop = { key: string; mapId: number; stopId: number | null; stopName: string; latitude: number; longitude: number };
const emptyPendingStop = (): StopDraft => ({ stopName: "", latitude: "", longitude: "" });

function arrangeRouteStops<T extends { latitude: number | string; longitude: number | string }>(stops: T[]): T[] {
  if (stops.length < 3) return stops;
  const start = stops[0];
  const namedDestinationIndex = stops.findIndex((stop, index) => index > 0 && "stopName" in stop && /college|campus/i.test(String(stop.stopName)));
  const endIndex = namedDestinationIndex > 0 ? namedDestinationIndex : stops.length - 1;
  const end = stops[endIndex];
  const meanLatitude = (Number(start.latitude) + Number(end.latitude)) / 2 * Math.PI / 180;
  const startX = Number(start.longitude) * Math.cos(meanLatitude);
  const startY = Number(start.latitude);
  const directionX = Number(end.longitude) * Math.cos(meanLatitude) - startX;
  const directionY = Number(end.latitude) - startY;
  const lengthSquared = directionX * directionX + directionY * directionY;
  if (lengthSquared === 0) return stops;
  const progress = (stop: T) => {
    const x = Number(stop.longitude) * Math.cos(meanLatitude);
    const y = Number(stop.latitude);
    return ((x - startX) * directionX + (y - startY) * directionY) / lengthSquared;
  };
  const intermediate = stops.filter((_, index) => index !== 0 && index !== endIndex);
  return [start, ...intermediate.sort((a, b) => progress(a) - progress(b)), end];
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [bus, setBus] = useState<Bus | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [savingRoute, setSavingRoute] = useState(false);
  const [pendingStop, setPendingStop] = useState<StopDraft | null>(null);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [editingRouteName, setEditingRouteName] = useState("");
  const [renamingRouteId, setRenamingRouteId] = useState<number | null>(null);
  const [editingStops, setEditingStops] = useState<EditableStop[]>([]);
  const [draggedStopKey, setDraggedStopKey] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [tripActionLoading, setTripActionLoading] = useState(false);
  const nextMapStopId = useRef(-1);

  async function load() {
    const assigned = await driverApi.bus();
    setBus(assigned);
    setRoutes(await driverApi.routes());
    const { currentTrip } = await driverApi.currentTrip();
    setTrip(currentTrip);
    if (currentTrip) setSelectedRouteId(String(currentTrip.routeId));
  }

  useEffect(() => {
    load().catch((err) => {
      if (import.meta.env.DEV) {
        const details = axios.isAxiosError(err) ? {
          message: err.message,
          url: `${err.config?.baseURL ?? ""}${err.config?.url ?? ""}`,
          status: err.response?.status,
          response: err.response?.data,
          stack: err.stack,
        } : { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined };
        console.error("Driver dashboard failed to load", details);
        setError(axios.isAxiosError(err) && err.response
          ? `Could not load driver data (${err.response.status}) from ${err.config?.url ?? "the API"}: ${getErrorMessage(err)}`
          : getErrorMessage(err));
      } else {
        setError(getErrorMessage(err));
      }
    });
  }, []);

  async function createRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bus) return;
    if (stops.length < 2) {
      setError("Add at least two stops to create a route.");
      return;
    }
    const invalidStop = stops.find((stop) => {
      const latitude = Number(stop.latitude);
      const longitude = Number(stop.longitude);
      return !stop.stopName.trim() || stop.latitude === "" || stop.longitude === ""
        || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
        || !Number.isFinite(longitude) || longitude < -180 || longitude > 180;
    });
    if (invalidStop) {
      setError("Enter a stop name and valid latitude/longitude for every stop.");
      return;
    }
    setSavingRoute(true);
    setError(null);
    try {
      const created = await driverApi.createRoute({
        routeName,
        busId: bus.id,
      stops: arrangeRouteStops(stops).map((stop, index) => ({
          stopName: stop.stopName.trim(),
          latitude: Number(stop.latitude),
          longitude: Number(stop.longitude),
          sequenceOrder: index + 1,
        })),
      });
      await load();
      setSelectedRouteId(String(created.id));
      setPendingStop(null);
      setRouteName("");
      setStops([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRoute(false);
    }
  }

  async function startTrip() {
    if (!bus || !selectedRouteId || trip) return;
    setTripActionLoading(true);
    setError(null);
    try {
      const started = await driverApi.startTrip(bus.id, Number(selectedRouteId));
      setTrip(started);
      setSelectedRouteId(String(started.routeId));
      navigate("/driver/trip");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTripActionLoading(false);
    }
  }

  async function resumeTrip() {
    if (!trip || trip.status !== "PAUSED") return;
    setTripActionLoading(true);
    setError(null);
    try {
      setTrip(await driverApi.resumeTrip(trip.id));
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTripActionLoading(false);
    }
  }

  async function endTrip() {
    if (!trip) return;
    setTripActionLoading(true);
    setError(null);
    try {
      await driverApi.endTrip(trip.id);
      setTrip(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTripActionLoading(false);
    }
  }

  function addPendingStop() {
    if (!pendingStop || !pendingStop.stopName.trim() || pendingStop.latitude === "" || pendingStop.longitude === "") {
      setError("Choose a place on the map and enter a name for the stop.");
      return;
    }
    const latitude = Number(pendingStop.latitude);
    const longitude = Number(pendingStop.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setError("Enter valid latitude and longitude values.");
      return;
    }
    if (editingRouteId !== null) {
      const mapId = nextMapStopId.current--;
      setEditingStops((current) => arrangeRouteStops([...current, {
        key: `new-${Math.abs(mapId)}`, mapId, stopId: null,
        stopName: pendingStop.stopName.trim(),
        latitude, longitude,
      } ]));
    } else {
      setStops((current) => arrangeRouteStops([...current, { ...pendingStop, stopName: pendingStop.stopName.trim() }]));
    }
    setPendingStop(null);
    setError(null);
  }

  function beginEditRoute(route: Route) {
    setSelectedRouteId(String(route.id));
    setRenamingRouteId(null);
    setEditingRouteId(route.id);
    setEditingRouteName(route.routeName);
    setEditingStops(arrangeRouteStops(route.stops.slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((stop) => ({
      key: `saved-${stop.id}`,
      mapId: stop.id,
      stopId: stop.id,
      stopName: stop.stopName,
      latitude: stop.latitude,
      longitude: stop.longitude,
    }))));
    setPendingStop(null);
    setError(null);
  }

  function moveStop(mapId: number, latitude: number, longitude: number) {
    setEditingStops((current) => current.map((stop) => stop.mapId === mapId ? { ...stop, latitude, longitude } : stop));
  }

  function reorderStop(fromKey: string, targetIndex: number) {
    setEditingStops((current) => {
      const fromIndex = current.findIndex((stop) => stop.key === fromKey);
      if (fromIndex < 0 || fromIndex === targetIndex) return current;
      const reordered = current.slice();
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return reordered;
    });
  }

  async function saveEditedRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingRouteId === null) return;
    const name = editingRouteName.trim();
    if (!name || editingStops.length < 2 || editingStops.some((stop) => !stop.stopName.trim())) {
      setError("Enter a route name and at least two named stops.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const currentRoute = routes.find((route) => route.id === editingRouteId);
      if (!currentRoute) throw new Error("Route could not be found. Refresh and try again.");
      await driverApi.saveRouteContents(editingRouteId, {
        routeName: name,
        stops: editingStops.map((stop) => ({
          ...(stop.stopId === null ? {} : { id: stop.stopId }),
          stopName: stop.stopName.trim(),
          latitude: stop.latitude,
          longitude: stop.longitude,
        })),
      });
      await load();
      setEditingRouteId(null);
      setEditingStops([]);
      setEditingRouteName("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveRouteName(event: FormEvent<HTMLFormElement>, routeId: number) {
    event.preventDefault();
    const name = editingRouteName.trim();
    if (!name) {
      setError("Enter a route name.");
      return;
    }
    try {
      await driverApi.updateRoute(routeId, name);
      setRenamingRouteId(null);
      setEditingRouteName("");
      setError(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteRoute(route: Route) {
    if (!window.confirm(`Delete “${route.routeName}”? This route will be removed from your list.`)) return;
    try {
      await driverApi.deleteRoute(route.id);
      if (selectedRouteId === String(route.id)) setSelectedRouteId("");
      if (editingRouteId === route.id) {
        setEditingRouteId(null);
        setEditingStops([]);
      }
      setError(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const savedMapStops = editingRouteId !== null
    ? editingStops.map((stop, index) => ({
        id: stop.mapId,
        routeId: editingRouteId,
        stopName: stop.stopName,
        latitude: stop.latitude,
        longitude: stop.longitude,
        sequenceOrder: index + 1,
      }))
    : routes.find((route) => String(route.id) === selectedRouteId)?.stops ?? [];
  const plannedMapStops = stops.map((stop, index) => ({
    id: -(index + 1), routeId: 0, stopName: stop.stopName || `Stop ${index + 1}`,
    latitude: Number(stop.latitude), longitude: Number(stop.longitude), sequenceOrder: index + 1,
  }));
  const mapStops = editingRouteId !== null ? savedMapStops : plannedMapStops.length > 0 ? plannedMapStops : savedMapStops;

  return (
    <div>
      <header className="driver-page-header">
        <div>
          <span className="eyebrow">DRIVER WORKSPACE</span>
          <h2>Plan your routes</h2>
          <p>Create a route, pin its stops on the map, and manage your saved routes.</p>
        </div>
        <div className="driver-route-count"><strong>{routes.length}</strong><span>saved routes</span></div>
      </header>
      <ErrorBanner message={error} />
      {bus && (
        <div className="card">
          <h3>Assigned bus {bus.busNumber}</h3>
          <p>Status: <StatusBadge status={bus.status} /></p>
          <p>Current trip: {trip ? `${trip.routeName} (${trip.status})` : "None"}</p>
          {trip?.status === "ACTIVE" && <Link className="live-trip-link" to="/driver/trip">Open live trip and share GPS <span aria-hidden="true">→</span></Link>}
          <form className="route-form" onSubmit={createRoute}>
            <h4>Add a route</h4>
            <label>
              Route name
              <input value={routeName} onChange={(e) => setRouteName(e.target.value)} required maxLength={120} placeholder="e.g. Morning route" />
            </label>
            <p className="muted">Add the route start first and its destination last. Stops between them are ordered automatically from their coordinates.</p>
            {stops.length > 0 && (
              <ol className="route-stop-list">
                {stops.map((stop, index) => (
                  <li key={`${stop.latitude}-${stop.longitude}-${index}`}>
                    <span><strong>{stop.stopName}</strong> ({stop.latitude}, {stop.longitude})</span>
                    <button type="button" className="danger" onClick={() => setStops((current) => current.filter((_, i) => i !== index))}>Remove</button>
                  </li>
                ))}
              </ol>
            )}
            <div className="row">
              <button type="button" className="secondary" onClick={() => setPendingStop(emptyPendingStop())}>Enter coordinates manually</button>
              <button type="submit" disabled={savingRoute || stops.length < 2}>{savingRoute ? "Saving route..." : "Create route"}</button>
            </div>
          </form>
          <div className="row">
            <label>
              Route for this trip
              <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} required>
                <option value="">Choose a route</option>
                {routes.map((route) => <option key={route.id} value={route.id}>{route.routeName}</option>)}
              </select>
            </label>
            {!trip && <button onClick={startTrip} disabled={!bus || !selectedRouteId || tripActionLoading}>{tripActionLoading ? "Starting..." : "Start trip"}</button>}
            {trip?.status === "ACTIVE" && <span className="trip-state-note"><i /> Trip is running</span>}
            {trip?.status === "PAUSED" && <button onClick={resumeTrip} disabled={tripActionLoading}>{tripActionLoading ? "Resuming..." : "Resume trip"}</button>}
            {trip && <button className="danger" onClick={endTrip} disabled={tripActionLoading}>{tripActionLoading ? "Ending..." : "End trip"}</button>}
          </div>
          {!trip && routes.length === 0 && <p className="muted">Create a route with at least two stops before starting a trip.</p>}
          {!trip && routes.length > 0 && !selectedRouteId && <p className="muted">Choose a route before starting the trip.</p>}
        </div>
      )}
      {editingRouteId !== null && (
        <form className="card route-editor" onSubmit={saveEditedRoute}>
          <div className="route-editor__header">
            <div><span className="eyebrow">ROUTE EDITOR</span><h3>Arrange your stops</h3><p className="muted">Stops are ordered by geographic progress from the first stop to the last. Drag rows to fine-tune.</p></div>
            <span className="route-editor__pill">{editingStops.length} stops</span>
          </div>
          <button type="button" className="secondary route-auto-arrange" onClick={() => setEditingStops((current) => arrangeRouteStops(current))}>Auto-arrange by location</button>
          <label className="route-editor__name">Route name<input value={editingRouteName} onChange={(event) => setEditingRouteName(event.target.value)} required maxLength={120} /></label>
          <ol className="route-queue">
            {editingStops.map((stop, index) => (
              <li
                className={`route-queue__item${draggedStopKey === stop.key ? " is-dragging" : ""}`}
                key={stop.key}
                draggable
                onDragStart={() => setDraggedStopKey(stop.key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); if (draggedStopKey) reorderStop(draggedStopKey, index); }}
                onDragEnd={() => setDraggedStopKey(null)}
              >
                <span className="route-queue__handle" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>
                <span className="route-queue__number">{String(index + 1).padStart(2, "0")}</span>
                <div className="route-queue__main">
                  <input value={stop.stopName} onChange={(event) => setEditingStops((current) => current.map((item) => item.key === stop.key ? { ...item, stopName: event.target.value } : item))} aria-label={`Stop ${index + 1} name`} required maxLength={120} />
                  <small>{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</small>
                </div>
                <div className="route-queue__controls">
                  <button type="button" className="route-icon-button" aria-label={`Move ${stop.stopName} up`} disabled={index === 0} onClick={() => reorderStop(stop.key, index - 1)}>↑</button>
                  <button type="button" className="route-icon-button" aria-label={`Move ${stop.stopName} down`} disabled={index === editingStops.length - 1} onClick={() => reorderStop(stop.key, index + 1)}>↓</button>
                  <button type="button" className="route-icon-button is-delete" aria-label={`Remove ${stop.stopName}`} onClick={() => setEditingStops((current) => current.filter((item) => item.key !== stop.key))}>×</button>
                </div>
              </li>
            ))}
          </ol>
          <div className="route-editor__footer">
            <span className="muted">Click the map to add another stop.</span>
            <div className="row">
              <button type="button" className="secondary" onClick={() => { setEditingRouteId(null); setEditingStops([]); setPendingStop(null); }}>Cancel</button>
              <button type="submit" disabled={savingEdit || editingStops.length < 2}>{savingEdit ? "Saving changes…" : "Save route"}</button>
            </div>
          </div>
        </form>
      )}
      <OsmMap
        buses={bus ? [bus] : []}
        selectedBusId={bus?.id ?? null}
        stops={mapStops}
        fitStops
        includeDraftPinInRoute={editingRouteId !== null || plannedMapStops.length > 0}
        onStopMove={editingRouteId === null ? undefined : moveStop}
        draftPin={pendingStop?.latitude && pendingStop.longitude ? { latitude: Number(pendingStop.latitude), longitude: Number(pendingStop.longitude) } : null}
        onMapClick={(latitude, longitude, suggestedName, source) => {
          const lat = latitude.toFixed(6);
          const lng = longitude.toFixed(6);
          setPendingStop((current) => {
            if (!suggestedName) return { stopName: "", latitude: lat, longitude: lng };
            if (current && Math.abs(Number(current.latitude) - latitude) < 0.00001 && Math.abs(Number(current.longitude) - longitude) < 0.00001) {
              return { ...current, stopName: current.stopName || suggestedName };
            }
            if (source === "map") return current;
            return { stopName: suggestedName, latitude: lat, longitude: lng };
          });
          setError(null);
        }}
      />
      {(editingRouteId !== null || plannedMapStops.length > 0) && <p className="muted">The preview includes your pending stop at the end of the route. A dashed teal segment shows the connection from a stop pin to the nearest drivable road.</p>}
      {pendingStop && (
        <div className="card add-stop-card">
          <h4>{editingRouteId === null ? "Add stop at this location" : "Add stop to route"}</h4>
          <label>
            Stop name
            <input autoFocus value={pendingStop.stopName} onChange={(event) => setPendingStop((current) => current ? { ...current, stopName: event.target.value } : current)} required maxLength={120} placeholder="e.g. Main Street" />
          </label>
          <p className="muted">A nearby map name is suggested automatically. You can edit it or enter your own stop name.</p>
          <div className="route-stop-coordinates">Location: {pendingStop.latitude || "—"}, {pendingStop.longitude || "—"}</div>
          <div className="route-stop-fields">
            <label>Latitude<input type="number" step="any" min="-90" max="90" value={pendingStop.latitude} onChange={(event) => setPendingStop((current) => current ? { ...current, latitude: event.target.value } : current)} /></label>
            <label>Longitude<input type="number" step="any" min="-180" max="180" value={pendingStop.longitude} onChange={(event) => setPendingStop((current) => current ? { ...current, longitude: event.target.value } : current)} /></label>
          </div>
          <div className="row">
            <button type="button" onClick={addPendingStop}>{editingRouteId === null ? "Add stop" : "Add to route"}</button>
            <button type="button" className="secondary" onClick={() => setPendingStop(null)}>Cancel</button>
          </div>
        </div>
      )}
      <section className="saved-routes-section">
        <div className="saved-routes-heading">
          <div><span className="eyebrow">YOUR ROUTES</span><h3>Saved routes</h3></div>
          <span className="muted">{routes.length} {routes.length === 1 ? "route" : "routes"}</span>
        </div>
        {routes.length === 0 ? (
          <div className="route-empty-state"><span className="route-empty-icon">⌖</span><strong>No saved routes yet</strong><span>Create a route above, then click the map to add its stops.</span></div>
        ) : (
          <div className="saved-routes-grid">
            {routes.map((route, index) => (
              <article className={`saved-route-card${selectedRouteId === String(route.id) ? " is-selected" : ""}`} key={route.id}>
                <div className="saved-route-card__top">
                  <span className="route-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="route-stop-count">{route.stops.length} stops</span>
                </div>
                {renamingRouteId === route.id ? (
                  <form className="route-rename-form" onSubmit={(event) => saveRouteName(event, route.id)}>
                    <input autoFocus value={editingRouteName} onChange={(event) => setEditingRouteName(event.target.value)} maxLength={120} aria-label="Route name" />
                    <button type="submit">Save</button>
                    <button type="button" className="secondary" onClick={() => setRenamingRouteId(null)}>Cancel</button>
                  </form>
                ) : (
                  <h4>{route.routeName}</h4>
                )}
                <ol className="saved-route-stops">
                  {route.stops.map((stop) => <li key={stop.id}>{stop.stopName}</li>)}
                </ol>
                <div className="saved-route-actions">
                  <button type="button" className="route-action-button" onClick={() => setSelectedRouteId(String(route.id))}>Show on map</button>
                  <button type="button" className="route-action-button" disabled={trip?.status === "ACTIVE" && trip.routeId === route.id} onClick={() => beginEditRoute(route)}>{trip?.status === "ACTIVE" && trip.routeId === route.id ? "In progress" : "Edit stops"}</button>
                  <button type="button" className="route-action-button" disabled={editingRouteId !== null} onClick={() => { setRenamingRouteId(route.id); setEditingRouteName(route.routeName); }}>Rename</button>
                  <button type="button" className="route-action-button is-danger" onClick={() => deleteRoute(route)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
