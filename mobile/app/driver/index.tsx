import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { OsmMap } from "../../src/components/OsmMap";
import { driverApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { Bus, Route, Trip } from "../../src/types";

export default function DriverHome() {
  const { logout } = useAuth();
  const router = useRouter();
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

  return (
    <Screen>
      <Title text="Driver dashboard" />
      <ErrorText message={error} />
      <Text>Assigned bus: {bus?.busNumber ?? "None"}</Text>
      <Text>Status: {bus?.status ?? "—"}</Text>
      <Text>Route: {routes[0]?.routeName ?? "None"}</Text>
      <Text>Trip: {trip?.status ?? "Not started"}</Text>
      <OsmMap bus={bus} stops={routes[0]?.stops ?? []} />
      <Pressable style={styles.button} onPress={() => router.push("/driver/create-route")}>
        <Text style={styles.buttonText}>Create route</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push("/driver/add-stop")}>
        <Text style={styles.buttonText}>Add stop</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push("/driver/trip")}>
        <Text style={styles.buttonText}>Manage trip</Text>
      </Pressable>
      <Pressable onPress={logout}><Text>Sign out</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700" },
});
