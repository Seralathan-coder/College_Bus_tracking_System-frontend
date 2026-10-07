import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { OsmMap } from "../../src/components/OsmMap";
import { studentApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import { subscribeToBus } from "../../src/websocket/stompClient";
import type { Stop, TrackingResponse } from "../../src/types";

export default function TrackingScreen() {
  const { busId, stopId } = useLocalSearchParams<{ busId: string; stopId: string }>();
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busId) return;
    const id = Number(busId);
    let active = true;
    const refresh = () => studentApi.tracking(id).then((snapshot) => {
      if (active) { setTracking(snapshot); setError(null); }
    }).catch((err) => { if (active) setError(getErrorMessage(err)); });
    refresh();
    studentApi.stops(id).then(setStops).catch((err) => setError(getErrorMessage(err)));
    const timer = setInterval(refresh, 5000);
    const unsubscribe = subscribeToBus(id, (snapshot) => { if (active) setTracking(snapshot); });
    return () => { active = false; clearInterval(timer); unsubscribe(); };
  }, [busId]);

  const selected = stops.find((s) => s.id === Number(stopId));

  return (
    <Screen>
      <Title text="Live tracking" />
      <ErrorText message={error} />
      <Text>Bus {tracking?.busNumber ?? "—"} · {tracking?.status}</Text>
      <Text>Speed {tracking?.speed?.toFixed(1) ?? "—"} km/h</Text>
      <Text>Distance {tracking?.distanceToSelectedStop ?? tracking?.distanceToNextStop ?? "—"} km</Text>
      <Text>ETA {tracking?.etaMinutes ?? "—"} min</Text>
      <Text>Next stop {tracking?.nextStop ?? "—"}</Text>
      <Text>Your stop {selected?.stopName ?? "—"}</Text>
      <Text>Last updated {tracking?.lastUpdated ? new Date(tracking.lastUpdated).toLocaleTimeString() : "—"}</Text>
      <OsmMap bus={tracking} stops={stops} studentStop={selected} height={320} />
    </Screen>
  );
}
