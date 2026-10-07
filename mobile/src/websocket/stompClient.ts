import { Client, type IMessage } from "@stomp/stompjs";
import { WS_URL } from "../constants";
import type { TrackingResponse } from "../types";

let client: Client | null = null;
const listeners = new Map<number, Set<(payload: TrackingResponse) => void>>();
const subs = new Map<number, { unsubscribe: () => void }>();

function ensureClient(): Client {
  if (client) return client;
  client = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 3000,
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    onConnect: () => {
      listeners.forEach((_, busId) => subscribeBus(busId));
    },
  });
  client.activate();
  return client;
}

function subscribeBus(busId: number) {
  if (!client?.connected || subs.has(busId)) return;
  const sub = client.subscribe(`/topic/bus/${busId}/location`, (message: IMessage) => {
    const payload = JSON.parse(message.body) as TrackingResponse;
    listeners.get(busId)?.forEach((fn) => fn(payload));
  });
  subs.set(busId, sub);
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
      subs.get(busId)?.unsubscribe();
      subs.delete(busId);
    }
  };
}
