import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { studentApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import type { Bus } from "../../src/types";

export default function SelectBus() {
  const router = useRouter();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    studentApi.buses().then(setBuses).catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <Screen>
      <Title text="Select bus" />
      <ErrorText message={error} />
      <TextInput
        style={styles.input}
        placeholder="Search bus number or driver"
        value={query}
        onChangeText={setQuery}
      />
      {buses
        .filter((bus) => `${bus.busNumber} ${bus.driverName ?? ""}`.toLowerCase().includes(query.toLowerCase()))
        .map((bus) => (
        <Pressable
          key={bus.id}
          style={styles.card}
          onPress={() => router.push({ pathname: "/student/select-stop", params: { busId: String(bus.id) } })}
        >
          <Text style={styles.title}>{bus.busNumber}</Text>
          <Text>{bus.driverName ?? "No driver"} · {bus.status}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 10 },
  title: { fontWeight: "700", fontSize: 16 },
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10 },
});
