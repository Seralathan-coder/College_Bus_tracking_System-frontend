import { useEffect } from "react";
import * as Location from "expo-location";
import { driverApi } from "../api/endpoints";

export function useTripGps(busId: number | null, active: boolean) {
  useEffect(() => {
    if (!busId || !active) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted || cancelled) return;
      const sendCurrentLocation = async () => {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await driverApi.sendLocation(busId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? undefined,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      };
      try {
        await sendCurrentLocation();
      } catch {
        // Keep retrying on the next interval if the first GPS fix is unavailable.
      }
      if (!cancelled) timer = setInterval(() => { void sendCurrentLocation().catch(() => undefined); }, 8000);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [busId, active]);
}
