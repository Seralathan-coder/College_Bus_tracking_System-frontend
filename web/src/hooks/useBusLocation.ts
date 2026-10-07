import { useEffect } from "react";
import { subscribeToBus } from "../websocket/stompClient";
import type { TrackingResponse } from "../types";

export function useBusLocation(busId: number | null, onUpdate: (payload: TrackingResponse) => void) {
  useEffect(() => {
    if (!busId) {
      return;
    }
    return subscribeToBus(busId, onUpdate);
  }, [busId, onUpdate]);
}
