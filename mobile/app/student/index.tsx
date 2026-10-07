import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { OsmMap } from "../../src/components/OsmMap";
import { studentApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import { useAuth } from "../../src/context/AuthContext";
import type { Bus, TrackingResponse } from "../../src/types";

export default function StudentHome() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    studentApi.buses().then(setBuses).catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <Screen>
      <ScrollView>
        <Title text={`Hi ${user?.name ?? "student"}`} />
        <ErrorText message={error} />
        <Pressable style={styles.button} onPress={() => router.push("/student/select-bus")}>
          <Text style={styles.buttonText}>Select bus</Text>
        </Pressable>
        {buses[0] && (
          <>
            <Text>Bus {buses[0].busNumber} · {buses[0].driverName} · {buses[0].status}</Text>
            <Text>Speed {tracking?.speed ?? buses[0].currentSpeed ?? "—"} km/h</Text>
            <Text>ETA {tracking?.etaMinutes ?? "—"} min · Next {tracking?.nextStop ?? "—"}</Text>
            <OsmMap bus={tracking ?? buses[0]} />
          </>
        )}
        <Pressable onPress={logout}><Text>Sign out</Text></Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  buttonText: { color: "white", fontWeight: "700" },
});
