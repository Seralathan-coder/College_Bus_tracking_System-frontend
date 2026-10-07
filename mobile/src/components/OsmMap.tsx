import MapView, { Marker, UrlTile } from "react-native-maps";
import { StyleSheet } from "react-native";
import { DEFAULT_REGION, OSM_TILE } from "../constants";
import type { Bus, Stop, TrackingResponse } from "../types";

interface Props {
  bus?: Bus | TrackingResponse | null;
  stops?: Stop[];
  studentStop?: Stop | null;
  height?: number;
  onMapPress?: (latitude: number, longitude: number) => void;
}

export function OsmMap({ bus, stops = [], studentStop, height = 280, onMapPress }: Props) {
  const latitude = "currentLat" in (bus ?? {}) ? (bus as Bus).currentLat : (bus as TrackingResponse | null)?.latitude;
  const longitude = "currentLng" in (bus ?? {}) ? (bus as Bus).currentLng : (bus as TrackingResponse | null)?.longitude;
  const region = latitude && longitude
    ? { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_REGION;

  return (
    <MapView
      style={[styles.map, { height }]}
      initialRegion={region}
      region={region}
      onPress={(event) => {
        const { latitude: lat, longitude: lng } = event.nativeEvent.coordinate;
        onMapPress?.(lat, lng);
      }}
    >
      <UrlTile urlTemplate={OSM_TILE} maximumZ={19} flipY={false} />
      {stops.map((stop) => (
        <Marker
          key={stop.id}
          coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
          title={stop.stopName}
          pinColor={studentStop?.id === stop.id ? "orange" : "green"}
        />
      ))}
      {latitude && longitude ? (
        <Marker coordinate={{ latitude, longitude }} title="Bus" pinColor="blue" />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", borderRadius: 12, overflow: "hidden", marginVertical: 12 },
});
