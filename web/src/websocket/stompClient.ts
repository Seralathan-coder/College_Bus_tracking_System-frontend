import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL } from "../constants";
import type { TrackingResponse } from "../types";

let client: Client | null = null;
const listeners = new Map<number, Set<(payload: TrackingResponse) => void>>();

function ensureClient(): Client {
  if (client) {
    return client;
  }
  client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      listeners.forEach((_, busId) => subscribeBus(busId));
    },
  });
  client.activate();
  return client;
}

const activeSubs = new Map<number, { unsubscribe: () => void }>();

function subscribeBus(busId: number) {
  if (!client?.connected || activeSubs.has(busId)) {
    return;
  }
  const sub = client.subscribe(`/topic/bus/${busId}/location`, (message: IMessage) => {
    const payload = JSON.parse(message.body) as TrackingResponse;
    listeners.get(busId)?.forEach((listener) => listener(payload));
  });
  activeSubs.set(busId, sub);
}

export function subscribeToBus(busId: number, listener: (payload: TrackingResponse) => void): () => void {
  ensureClient();
  const set = listeners.get(busId) ?? new Set<(payload: TrackingResponse) => void>();
  set.add(listener);
  listeners.set(busId, set);
  subscribeBus(busId);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      listeners.delete(busId);
      activeSubs.get(busId)?.unsubscribe();
      activeSubs.delete(busId);
    }
  };
}
