import { useEffect, useState } from "react";
import { getErrorMessage } from "../../api/client";
import { driverApi } from "../../api/endpoints";
import { ErrorBanner, StatusBadge } from "../../components/Ui";
import { OsmMap } from "../../maps/OsmMap";
import type { Bus, Route, TrackingResponse, Trip } from "../../types";
import { subscribeToBus } from "../../websocket/stompClient";

export default function LiveTrip() {
  const [bus, setBus] = useState<Bus | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [tripActionLoading, setTripActionLoading] = useState(false);
  const busId = bus?.id ?? null;
  const tripStatus = trip?.status;

  async function load() {
    const assigned = await driverApi.bus();
    setBus(assigned);
    setRoutes(await driverApi.routes());
    setTrip((await driverApi.currentTrip()).currentTrip);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!bus) return;
    return subscribeToBus(bus.id, setTracking);
  }, [bus?.id]);

  useEffect(() => {
    if (!busId || tripStatus !== "ACTIVE") {
      setSending(false);
      return;
    }
    if (!navigator.geolocation) {
      setGpsMessage("GPS is unavailable in this browser. Open the app on a device with location enabled.");
      return;
    }

    setGpsMessage("Allow location access to share this bus location with students.");
    let active = true;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsMessage(null);
        driverApi.sendLocation(busId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        }).then((response) => {
          if (active) {
            setTracking(response);
            setBus((currentBus) => currentBus?.id === response.busId ? {
              ...currentBus,
              currentLat: response.latitude,
              currentLng: response.longitude,
              currentSpeed: response.speed,
              lastUpdated: response.lastUpdated,
              status: response.status,
            } : currentBus);
            setSending(true);
            setError(null);
          }
        }).catch((err) => {
          if (active) {
            setSending(false);
            setError(getErrorMessage(err));
          }
        });
      },
      (geoError) => {
        if (!active) return;
        setSending(false);
        setGpsMessage(geoError.code === geoError.PERMISSION_DENIED
          ? "Location permission is blocked. Allow location access in your browser settings to share GPS."
          : "Waiting for a GPS signal. Check that device location is enabled.");
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [busId, tripStatus]);

  async function changeTripStatus(action: "pause" | "resume" | "end") {
    if (!trip) return;
    setTripActionLoading(true);
    setError(null);
    try {
      if (action === "pause") await driverApi.pauseTrip(trip.id);
      if (action === "resume") await driverApi.resumeTrip(trip.id);
      if (action === "end") await driverApi.endTrip(trip.id);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTripActionLoading(false);
    }
  }

  return (
    <div>
      <h2>Live trip</h2>
      <ErrorBanner message={error} />
      {trip ? (
        <p>
          Trip #{trip.id} <StatusBadge status={trip.status} /> {sending ? "· sending GPS" : ""}
        </p>
      ) : (
        <p>No active trip. Start one from the dashboard.</p>
      )}
      {trip && (
        <div className="row">
          {trip.status === "ACTIVE" && <button onClick={() => changeTripStatus("pause")} disabled={tripActionLoading}>{tripActionLoading ? "Updating..." : "Pause trip"}</button>}
          {trip.status === "PAUSED" && <button onClick={() => changeTripStatus("resume")} disabled={tripActionLoading}>{tripActionLoading ? "Updating..." : "Resume trip"}</button>}
          <button className="danger" onClick={() => changeTripStatus("end")} disabled={tripActionLoading}>{tripActionLoading ? "Updating..." : "End trip"}</button>
        </div>
      )}
      {trip?.status === "ACTIVE" && <p className={`gps-state${sending ? " is-live" : ""}`}><span />{sending ? "GPS is live — students can see this bus" : gpsMessage ?? "Connecting to GPS…"}</p>}
      <OsmMap tracking={tracking} buses={bus ? [bus] : []} stops={routes.find((route) => route.id === trip?.routeId)?.stops ?? []} selectedBusId={bus?.id ?? null} />
    </div>
  );
}
