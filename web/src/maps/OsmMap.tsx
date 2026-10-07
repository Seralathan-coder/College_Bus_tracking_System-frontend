import { useEffect, useRef, useState, type FormEvent } from "react";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { DEFAULT_CENTER } from "../constants";
import type { Bus, Stop, TrackingResponse } from "../types";
import "leaflet/dist/leaflet.css";

const busIcon = new L.DivIcon({
  className: "bus-marker",
  html: '<span class="map-bus-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="6" width="30" height="35" rx="8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13 13h22v13H13z" fill="#eaf7f5"/><path d="M13 30h22" stroke="#83c8bd" stroke-width="4" stroke-linecap="round"/><path d="M24 14v11" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="36" r="2" fill="currentColor"/><circle cx="32" cy="36" r="2" fill="currentColor"/></svg></span>',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});
const numberedStopIcon = (number: number, selected: boolean) => new L.DivIcon({
  className: "stop-marker",
  html: `<span class="map-stop-dot${selected ? " is-selected" : ""}">${number}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
const selectedStopIcon = new L.DivIcon({ className: "stop-marker stop-marker-selected", html: '<span class="map-stop-dot is-selected"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });
const searchPinIcon = new L.DivIcon({ className: "search-marker", html: '<span class="map-search-pin"></span>', iconSize: [30, 30], iconAnchor: [15, 15] });
const indiaBounds = L.latLngBounds([6, 68], [37, 98]);
const geocodeCache = new Map<string, SearchResult[]>();
let lastGeocodeRequestAt = 0;
let geocoderQueue: Promise<void> = Promise.resolve();

interface SearchResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

interface ReverseResult {
  name?: string;
  address?: Record<string, string>;
}

function geocoderTurn(): Promise<void> {
  const turn = geocoderQueue.then(async () => {
    const wait = Math.max(0, 1000 - (Date.now() - lastGeocodeRequestAt));
    if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
    lastGeocodeRequestAt = Date.now();
  });
  geocoderQueue = turn.catch(() => undefined);
  return turn;
}

function placeLabel(result: SearchResult): string {
  return result.name?.trim() || result.display_name.split(",")[0].trim();
}

async function reverseLocationName(latitude: number, longitude: number): Promise<string | null> {
  try {
    await geocoderTurn();
    const params = new URLSearchParams({ format: "jsonv2", lat: String(latitude), lon: String(longitude), zoom: "18", addressdetails: "1", "accept-language": "en" });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const result = await response.json() as ReverseResult;
    const address = result.address ?? {};
    return result.name?.trim()
      || address.amenity || address.shop || address.tourism || address.bus_stop || address.road
      || address.village || address.suburb || address.town || address.city_district || address.city || null;
  } catch {
    return null;
  }
}

export interface StopSnapDistance {
  stopId: number;
  stopName: string;
  distanceMeters: number;
}

function getValidCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): [number, number] | null {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !indiaBounds.contains([latitude, longitude])
  ) {
    return null;
  }
  return [latitude, longitude];
}

interface Props {
  buses?: Bus[];
  tracking?: TrackingResponse | null;
  stops?: Stop[];
  includeDraftPinInRoute?: boolean;
  selectedStopId?: number | null;
  selectedBusId?: number | null;
  draftPin?: { latitude: number; longitude: number } | null;
  followBus?: boolean;
  showStopPopups?: boolean;
  fitStops?: boolean;
  onBusClick?: (bus: Bus) => void;
  onStopClick?: (stopId: number) => void;
  onMapClick?: (latitude: number, longitude: number, suggestedName?: string, source?: "map" | "search") => void;
  onStopMove?: (stopId: number, latitude: number, longitude: number) => void;
  onSnapDistances?: (distances: StopSnapDistance[]) => void;
  height?: string;
}

function OpenStreetMapTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxNativeZoom={18}
      keepBuffer={3}
      noWrap
    />
  );
}

function MapClickHandler({ onMapClick }: { onMapClick?: (latitude: number, longitude: number, suggestedName?: string, source?: "map" | "search") => void }) {
  useMapEvents({ click: (event) => {
    const { lat, lng } = event.latlng;
    onMapClick?.(lat, lng, undefined, "map");
    reverseLocationName(lat, lng).then((name) => { if (name) onMapClick?.(lat, lng, name, "map"); });
  } });
  return null;
}

function FollowBus({
  busId,
  latitude,
  longitude,
  enabled,
}: {
  busId: number | null;
  latitude: number | null;
  longitude: number | null;
  enabled: boolean;
}) {
  const map = useMap();
  const previousBusId = useRef<number | null>(null);

  useEffect(() => {
    const position = getValidCoordinates(latitude, longitude);
    if (!enabled || busId === null || !position) return;
    if (previousBusId.current !== busId) {
      map.setView(position, Math.max(map.getZoom(), 13), { animate: true });
    } else {
      map.panTo(position, { animate: true });
    }
    previousBusId.current = busId;
  }, [busId, enabled, latitude, longitude, map]);

  return null;
}

function SearchLocationMarker({ result }: { result: SearchResult | null }) {
  const map = useMap();
  useEffect(() => {
    if (!result) return;
    map.flyTo([Number(result.lat), Number(result.lon)], Math.max(map.getZoom(), 16), { duration: 0.7 });
  }, [map, result]);
  if (!result) return null;
  return <Marker position={[Number(result.lat), Number(result.lon)]} icon={searchPinIcon}><Popup>{result.display_name}</Popup></Marker>;
}

async function queryLocations(term: string): Promise<SearchResult[]> {
  await geocoderTurn();
  const params = new URLSearchParams({ q: term, format: "jsonv2", limit: "5", countrycodes: "in", "accept-language": "en" });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Location search is temporarily unavailable.");
  return response.json() as Promise<SearchResult[]>;
}

function LocationSearch({ onLocate, onUseLocation, onClear }: { onLocate: (result: SearchResult) => void; onUseLocation?: (latitude: number, longitude: number, suggestedName?: string) => void; onClear: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 3) {
      setMessage("Enter at least 3 letters to search.");
      setResults([]);
      return;
    }
    const cacheKey = term.toLocaleLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) {
      setResults(cached);
      setMessage(cached.length ? "Choose a place to show it on the map." : "No matching places found.");
      return;
    }
    setLoading(true);
    setMessage("");
    setSelectedResult(null);
    try {
      let places = await queryLocations(term);
      if (places.length === 0 && !/\b(india|tamil nadu)\b/i.test(term)) {
        places = await queryLocations(`${term}, Tamil Nadu, India`);
      }
      geocodeCache.set(cacheKey, places);
      setResults(places);
      setMessage(places.length ? "Choose a place to show it on the map." : "No match found. Try adding a nearby town or district.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Location search is temporarily unavailable.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return <div className="map-location-search">
    <form className="map-location-search__form" onSubmit={search}>
      <span aria-hidden="true">⌕</span>
      <input aria-label="Search map locations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a place or address" />
      <button type="submit" disabled={loading}>{loading ? "…" : "Search"}</button>
      {(query || selectedResult || results.length > 0) && <button className="map-location-search__clear" type="button" aria-label="Clear location search and close results" title="Clear and close" onClick={() => { setQuery(""); setResults([]); setMessage(""); setSelectedResult(null); onClear(); }}>×</button>}
    </form>
    {(message || results.length > 0) && <div className="map-location-search__results" aria-live="polite">
      <div className="map-location-search__results-heading"><p>{message}</p><button type="button" aria-label="Close location results" title="Close" onClick={() => { setResults([]); setMessage(""); setSelectedResult(null); onClear(); }}>×</button></div>
      {results.map((result) => <button className={selectedResult?.place_id === result.place_id ? "is-selected" : ""} type="button" key={result.place_id} onClick={() => { setSelectedResult(result); onLocate(result); }}>{result.display_name}</button>)}
      {selectedResult && onUseLocation && <button className="map-location-search__use" type="button" onClick={() => onUseLocation(Number(selectedResult.lat), Number(selectedResult.lon), placeLabel(selectedResult))}>Use this location</button>}
    </div>}
  </div>;
}

function FitRouteStops({ stops, enabled }: { stops: [number, number][]; enabled: boolean }) {
  const map = useMap();
  const lastFittedStops = useRef("");

  useEffect(() => {
    if (!enabled || stops.length === 0) return;
    const key = stops.map(([latitude, longitude]) => `${latitude.toFixed(6)},${longitude.toFixed(6)}`).join(";");
    if (lastFittedStops.current === key) return;
    if (stops.length === 1) map.setView(stops[0], 16, { animate: true });
    else map.fitBounds(L.latLngBounds(stops), { padding: [48, 48], maxZoom: 16, animate: true });
    lastFittedStops.current = key;
  }, [enabled, map, stops]);

  return null;
}

function bearingBetween(first: Stop, second: Stop): number {
  const radians = Math.PI / 180;
  const lat1 = first.latitude * radians;
  const lat2 = second.latitude * radians;
  const deltaLng = (second.longitude - first.longitude) * radians;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360));
}

function RoadRoute({ stops, onSnapDistances }: { stops: Stop[]; onSnapDistances?: (distances: StopSnapDistance[]) => void }) {
  const [roadLine, setRoadLine] = useState<[number, number][] | null>(null);
  const [stopConnectors, setStopConnectors] = useState<[[number, number], [number, number]][]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const routeKey = stops.map((stop) => `${stop.id}:${stop.sequenceOrder}:${stop.latitude},${stop.longitude}`).join(";");

  useEffect(() => {
    if (stops.length < 2) {
      setRoadLine(null);
      setStopConnectors([]);
      setUnavailable(false);
      setUsedFallback(false);
      onSnapDistances?.([]);
      return;
    }

    const controller = new AbortController();
    setRoadLine(null);
    setStopConnectors([]);
    setUnavailable(false);
    setUsedFallback(false);
    const coordinates = stops.map((stop) => `${stop.longitude},${stop.latitude}`).join(";");
    const bearings = stops.map((stop, index) => {
      const from = index > 0 ? stops[index - 1] : stop;
      const toward = index < stops.length - 1 ? stops[index + 1] : stop;
      return `${bearingBetween(from, toward)},60`;
    }).join(";");
    const radiuses = stops.map(() => "250").join(";");
    const params = new URLSearchParams({
      overview: "full",
      geometries: "geojson",
      steps: "false",
      bearings,
      radiuses,
      continue_straight: "true",
    });
    const baseUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}`;
    const requestRoute = async (query: string) => {
      const response = await fetch(`${baseUrl}?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Road routing returned ${response.status}`);
      return response.json() as Promise<{
        code?: string;
        routes?: { geometry?: { coordinates?: [number, number][] } }[];
        waypoints?: { location?: [number, number]; distance?: number }[];
      }>;
    };
    void (async () => {
      try {
        let result: Awaited<ReturnType<typeof requestRoute>>;
        let usedLooseMatch = false;
        try {
          result = await requestRoute(params.toString());
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") throw error;
          result = await requestRoute(new URLSearchParams({ overview: "full", geometries: "geojson", steps: "false" }).toString());
          usedLooseMatch = true;
        }
        let coordinates = result.code === "Ok" ? result.routes?.[0]?.geometry?.coordinates : undefined;
        if ((!coordinates || coordinates.length < 2) && !usedLooseMatch) {
          result = await requestRoute(new URLSearchParams({ overview: "full", geometries: "geojson", steps: "false" }).toString());
          usedLooseMatch = true;
          coordinates = result.code === "Ok" ? result.routes?.[0]?.geometry?.coordinates : undefined;
        }
        if (!coordinates || coordinates.length < 2) throw new Error("No road route found");
        setUsedFallback(usedLooseMatch);
        setRoadLine(coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        if (result.waypoints?.length === stops.length) {
          onSnapDistances?.(result.waypoints.flatMap((waypoint, index) =>
            (waypoint.distance ?? 0) > 50
              ? [{ stopId: stops[index].id, stopName: stops[index].stopName, distanceMeters: waypoint.distance ?? 0 }]
              : [],
          ));
          setStopConnectors(stops.flatMap((stop, index) => {
            const snapped = result.waypoints?.[index]?.location;
            if (!snapped) return [];
            const snappedPosition: [number, number] = [snapped[1], snapped[0]];
            const stopPosition: [number, number] = [stop.latitude, stop.longitude];
            const distance = L.latLng(stopPosition).distanceTo(L.latLng(snappedPosition));
            return distance > 8 ? [[stopPosition, snappedPosition] as [[number, number], [number, number]]] : [];
          }));
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        onSnapDistances?.([]);
        setUnavailable(true);
      }
    })();

    return () => controller.abort();
    // routeKey represents the stop coordinates and avoids requests on unrelated map renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSnapDistances, routeKey]);

  return <>
    {roadLine && <Polyline positions={roadLine} color="#157d70" weight={4} opacity={0.92} />}
    {stopConnectors.map((connector, index) => (
      <Polyline key={`stop-connector-${index}`} positions={connector} color="#26a68f" weight={4} dashArray="7 5" opacity={1} />
    ))}
    {usedFallback && <div className="map-route-status" role="status">Route shown using the nearest drivable roads. Check stop positions.</div>}
    {unavailable && <div className="map-route-status" role="status">Can&apos;t match a stop to a road within 250 m. Move its pin onto a road.</div>}
  </>;
}

export function OsmMap({
  buses = [],
  tracking,
  stops = [],
  includeDraftPinInRoute = false,
  selectedStopId,
  selectedBusId,
  draftPin,
  followBus = false,
  showStopPopups = true,
  fitStops = false,
  onBusClick,
  onStopClick,
  onMapClick,
  onStopMove,
  onSnapDistances,
  height = "420px",
}: Props) {
  const selectedBus = buses.find((bus) => bus.id === selectedBusId);
  const trackingPosition = getValidCoordinates(tracking?.latitude, tracking?.longitude);
  const selectedBusPosition = getValidCoordinates(selectedBus?.currentLat, selectedBus?.currentLng);
  const center = trackingPosition ?? selectedBusPosition ?? DEFAULT_CENTER;
  const orderedStops = stops
    .slice()
    .sort((first, second) => first.sequenceOrder - second.sequenceOrder);
  const routeStops = orderedStops.filter((stop) => getValidCoordinates(stop.latitude, stop.longitude));
  const routePreviewStops = includeDraftPinInRoute && draftPin && getValidCoordinates(draftPin.latitude, draftPin.longitude)
    ? [...routeStops, {
        id: -1000000,
        routeId: routeStops[0]?.routeId ?? 0,
        stopName: "New stop",
        latitude: draftPin.latitude,
        longitude: draftPin.longitude,
        sequenceOrder: Math.max(0, ...routeStops.map((stop) => stop.sequenceOrder)) + 1,
      }]
    : routeStops;
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  return (
    <div className="map-wrap" style={{ height }}>
      <LocationSearch onLocate={setSearchResult} onUseLocation={(latitude, longitude, name) => onMapClick?.(latitude, longitude, name, "search")} onClear={() => setSearchResult(null)} />
      <MapContainer
        center={center}
        zoom={13}
        zoomSnap={0.5}
        minZoom={6}
        maxZoom={18}
        maxBounds={indiaBounds}
        maxBoundsViscosity={1}
        scrollWheelZoom
        doubleClickZoom
        touchZoom
        style={{ height: "100%", width: "100%" }}
      >
        <OpenStreetMapTiles />
        <MapClickHandler onMapClick={onMapClick} />
        <SearchLocationMarker result={searchResult} />
        <FitRouteStops stops={routePreviewStops.map((stop) => [stop.latitude, stop.longitude])} enabled={fitStops} />
        {draftPin && getValidCoordinates(draftPin.latitude, draftPin.longitude) && (
          <Marker position={[draftPin.latitude, draftPin.longitude]} icon={selectedStopIcon}>
            <Popup>New route stop</Popup>
          </Marker>
        )}
        <FollowBus
          busId={selectedBusId ?? null}
          latitude={trackingPosition?.[0] ?? selectedBusPosition?.[0] ?? null}
          longitude={trackingPosition?.[1] ?? selectedBusPosition?.[1] ?? null}
          enabled={followBus}
        />
        <RoadRoute stops={routePreviewStops} onSnapDistances={onSnapDistances} />
        {orderedStops.map((stop) => {
          const position = getValidCoordinates(stop.latitude, stop.longitude);
          if (!position) return null;
          return (
            <Marker
              key={stop.id}
              position={position}
              icon={numberedStopIcon(stop.sequenceOrder, selectedStopId === stop.id)}
              draggable={Boolean(onStopMove)}
              eventHandlers={{
                ...(onStopClick ? { click: () => onStopClick(stop.id) } : {}),
                ...(onStopMove ? { dragend: (event: L.LeafletEvent) => {
                  const marker = event.target as L.Marker;
                  const nextPosition = marker.getLatLng();
                  onStopMove(stop.id, nextPosition.lat, nextPosition.lng);
                } } : {}),
              }}
            >
              {showStopPopups && <Popup>
                  {stop.stopName}
                  {selectedStopId === stop.id ? " (selected)" : ""}
                </Popup>}
            </Marker>
          );
        })}
        {buses
          .filter((bus) => selectedBusId == null || bus.id === selectedBusId)
          .map((bus) => {
            const position = getValidCoordinates(bus.currentLat, bus.currentLng);
            if (!position) return null;
            return (
              <Marker
                key={bus.id}
                position={position}
                icon={busIcon}
                eventHandlers={{ click: () => onBusClick?.(bus) }}
              >
                <Popup>
                  <strong>{bus.busNumber}</strong>
                  <div>Driver: {bus.driverName ?? "Unassigned"}</div>
                  <div>Status: {bus.status}</div>
                  <div>Speed: {bus.currentSpeed?.toFixed(1) ?? "—"} km/h</div>
                </Popup>
              </Marker>
            );
          })}
        {tracking && trackingPosition && !buses.some((bus) => bus.id === tracking.busId) && (
          <Marker position={trackingPosition} icon={busIcon}>
            <Popup>
              <strong>{tracking.busNumber}</strong>
              <div>Next: {tracking.nextStop ?? "—"}</div>
              <div>ETA: {tracking.etaMinutes ?? "—"} min</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      {selectedBusId !== undefined && selectedBusId !== null && !selectedBusPosition && !trackingPosition && (
        <div className="map-location-empty" role="status">
          <strong>No live bus location yet</strong>
          <span>Live location appears after the driver starts the trip and allows GPS access.</span>
        </div>
      )}
    </div>
  );
}
