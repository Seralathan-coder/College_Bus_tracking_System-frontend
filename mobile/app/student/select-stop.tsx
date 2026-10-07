import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { OsmMap } from "../../src/components/OsmMap";
import { studentApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import type { Stop } from "../../src/types";

export default function SelectStop() {
  const { busId } = useLocalSearchParams<{ busId: string }>();
  const router = useRouter();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selected, setSelected] = useState<Stop | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!busId) return;
    studentApi.stops(Number(busId)).then(setStops).catch((err) => setError(getErrorMessage(err)));
  }, [busId]);

  async function confirm() {
    if (!busId || !selected) return;
    try {
      await studentApi.selectStop(Number(busId), selected.id);
      router.push({ pathname: "/student/tracking", params: { busId, stopId: String(selected.id) } });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Screen>
      <Title text="Select stop" />
      <ErrorText message={error} />
      {stops.map((stop) => (
        <Pressable key={stop.id} style={styles.card} onPress={() => setSelected(stop)}>
          <Text>{stop.sequenceOrder}. {stop.stopName}{selected?.id === stop.id ? " ✓" : ""}</Text>
        </Pressable>
      ))}
      <OsmMap stops={stops} studentStop={selected} />
      <Pressable style={styles.button} onPress={confirm}><Text style={styles.buttonText}>Confirm</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", padding: 12, borderRadius: 8, marginBottom: 8 },
  button: { backgroundColor: "#e85d04", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
