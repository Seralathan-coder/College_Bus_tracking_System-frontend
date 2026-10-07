import { api } from "./client";
import type { Bus, CurrentTripResponse, LoginResponse, Route, Stop, TrackingResponse, Trip, User } from "../types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/auth/login", { email, password }).then((r) => r.data),
  signup: (name: string, email: string, password: string) =>
    api.post<User>("/auth/signup", { name, email, password }).then((r) => r.data),
};

export const studentApi = {
  buses: () => api.get<Bus[]>("/buses").then((r) => r.data),
  stops: (busId: number) => api.get<Stop[]>(`/buses/${busId}/stops`).then((r) => r.data),
  selectStop: (busId: number, stopId: number) =>
    api.post("/student/select-stop", { busId, stopId }).then((r) => r.data),
  tracking: (busId: number) => api.get<TrackingResponse>(`/student/tracking/${busId}`).then((r) => r.data),
};

export const driverApi = {
  bus: () => api.get<Bus>("/driver/bus").then((r) => r.data),
  routes: () => api.get<Route[]>("/driver/routes").then((r) => r.data),
  createRoute: (payload: {
    routeName: string;
    busId: number;
    stops: { stopName: string; latitude: number; longitude: number; sequenceOrder: number }[];
  }) => api.post<Route>("/driver/route", payload).then((r) => r.data),
  addStop: (payload: {
    routeId: number;
    stopName: string;
    latitude: number;
    longitude: number;
    sequenceOrder: number;
  }) => api.post("/driver/stop", payload).then((r) => r.data),
  startTrip: (busId: number, routeId?: number) =>
    api.post<Trip>("/driver/trip/start", { busId, routeId }).then((r) => r.data),
  endTrip: (tripId: number) => api.post<Trip>(`/driver/trip/${tripId}/end`).then((r) => r.data),
  pauseTrip: (tripId: number) => api.post<Trip>(`/driver/trip/${tripId}/pause`).then((r) => r.data),
  currentTrip: () => api.get<CurrentTripResponse>("/driver/trip/current").then((r) => r.data),
  sendLocation: (busId: number, payload: { latitude: number; longitude: number; accuracy?: number; timestamp?: string }) =>
    api.post<TrackingResponse>(`/bus/${busId}/location`, payload).then((r) => r.data),
};
