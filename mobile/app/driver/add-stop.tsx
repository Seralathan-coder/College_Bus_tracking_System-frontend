import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";
import { ErrorText, Screen, Title } from "../../src/components/Ui";
import { driverApi } from "../../src/api/endpoints";
import { getErrorMessage } from "../../src/api/client";
import { DEFAULT_REGION, OSM_TILE } from "../../src/constants";
import type { Route } from "../../src/types";

export default function AddStop() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [stopName, setStopName] = useState("");
  const [point, setPoint] = useState(DEFAULT_REGION);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    driverApi.routes().then((list) => {
      setRoutes(list);
      setRouteId(list[0]?.id ?? null);
    }).catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function save() {
    if (!routeId || !stopName) return;
    try {
      const route = routes.find((item) => item.id === routeId);
      await driverApi.addStop({
        routeId,
        stopName,
        latitude: point.latitude,
        longitude: point.longitude,
        sequenceOrder: (route?.stops.length ?? 0) + 1,
      });
      setStopName("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Screen>
      <Title text="Add stop" />
      <ErrorText message={error} />
      <Text>Route: {routes[0]?.routeName ?? "Create a route first"}</Text>
      <TextInput style={styles.input} value={stopName} onChangeText={setStopName} placeholder="Stop name" />
      <MapView
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        onPress={(event) => setPoint({ ...DEFAULT_REGION, ...event.nativeEvent.coordinate })}
      >
        <UrlTile urlTemplate={OSM_TILE} maximumZ={19} flipY={false} />
        <Marker coordinate={{ latitude: point.latitude, longitude: point.longitude }} />
      </MapView>
      <Text>Lat {point.latitude.toFixed(5)} · Lng {point.longitude.toFixed(5)}</Text>
      <Pressable style={styles.button} onPress={save}><Text style={styles.buttonText}>Save stop</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10 },
  map: { height: 280, borderRadius: 12, marginVertical: 12 },
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
