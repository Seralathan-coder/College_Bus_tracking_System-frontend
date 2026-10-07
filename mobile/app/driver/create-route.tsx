import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { OsmMap } from "../../src/components/OsmMap";
import { driverApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import type { Bus, Stop } from "../../src/types";

interface DraftStop {
  stopName: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
}

export default function CreateRoute() {
  const [bus, setBus] = useState<Bus | null>(null);
  const [routeName, setRouteName] = useState("Erode to College");
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [pending, setPending] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stopName, setStopName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    driverApi.bus().then(setBus).catch((err) => setError(getErrorMessage(err)));
  }, []);

  function addStop() {
    if (!pending || !stopName) return;
    setStops((current) => [
      ...current,
      { stopName, latitude: pending.latitude, longitude: pending.longitude, sequenceOrder: current.length + 1 },
    ]);
    setStopName("");
    setPending(null);
  }

  async function save() {
    if (!bus) return;
    try {
      await driverApi.createRoute({ routeName, busId: bus.id, stops });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const mapStops: Stop[] = stops.map((stop, index) => ({
    id: index,
    stopName: stop.stopName,
    latitude: stop.latitude,
    longitude: stop.longitude,
    sequenceOrder: stop.sequenceOrder,
    routeId: 0,
  }));

  return (
    <Screen>
      <Title text="Create route" />
      <ErrorText message={error} />
      <TextInput style={styles.input} value={routeName} onChangeText={setRouteName} placeholder="Route name" />
      <Text>Tap the OpenStreetMap to capture a stop, then enter a name.</Text>
      <OsmMap stops={mapStops} onMapPress={(latitude, longitude) => setPending({ latitude, longitude })} />
      {pending && (
        <>
          <Text>Lat {pending.latitude.toFixed(5)} Lng {pending.longitude.toFixed(5)}</Text>
          <TextInput style={styles.input} value={stopName} onChangeText={setStopName} placeholder="Stop name" />
          <Pressable style={styles.button} onPress={addStop}><Text style={styles.buttonText}>Add stop</Text></Pressable>
        </>
      )}
      {stops.map((stop) => (
        <Pressable key={stop.sequenceOrder} onPress={() => setStops((current) => current.filter((item) => item !== stop).map((item, i) => ({ ...item, sequenceOrder: i + 1 })))}>
          <Text>{stop.sequenceOrder}. {stop.stopName} (tap to remove)</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => setStops((s) => s.slice().reverse().map((item, i) => ({ ...item, sequenceOrder: i + 1 })))}>
        <Text>Reverse order</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>Save route</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700" },
});
