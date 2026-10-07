import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { OsmMap } from "../../src/components/OsmMap";
import { driverApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import { useTripGps } from "../../src/hooks/useTripGps";
import type { Bus, Route, Trip } from "../../src/types";

export default function TripScreen() {
  const [bus, setBus] = useState<Bus | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const assigned = await driverApi.bus();
    setBus(assigned);
    setRoutes(await driverApi.routes());
    setTrip((await driverApi.currentTrip()).currentTrip);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

  useTripGps(bus?.id ?? null, trip?.status === "ACTIVE");

  async function start() {
    if (!bus) return;
    try {
      setTrip(await driverApi.startTrip(bus.id, routes[0]?.id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Screen>
      <Title text="Trip" />
      <ErrorText message={error} />
      <Text>Bus {bus?.busNumber ?? "—"}</Text>
      <Text>Status {trip?.status ?? "IDLE"}</Text>
      <Text>{trip?.status === "ACTIVE" ? "Sending GPS every 8 seconds" : "GPS idle"}</Text>
      <OsmMap bus={bus} stops={routes[0]?.stops ?? []} />
      <Pressable style={styles.button} onPress={start}><Text style={styles.buttonText}>Start trip</Text></Pressable>
      {trip && (
        <>
          <Pressable style={styles.button} onPress={() => driverApi.pauseTrip(trip.id).then(load)}>
            <Text style={styles.buttonText}>Pause trip</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => driverApi.endTrip(trip.id).then(load)}>
            <Text style={styles.buttonText}>End trip</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700" },
});
