import { api } from "./client";
import type {
  Bus,
  CurrentTripResponse,
  DashboardStats,
  EtaResponse,
  LoginResponse,
  Route,
  Stop,
  StudentStop,
  StopSuggestion,
  TrackingResponse,
  Trip,
  User,
  Role,
} from "../types";

export const authApi = {
  login: (email: string, password: string, role: Role) =>
    api.post<LoginResponse>("/auth/login", { email, password, role }).then((r) => r.data),
  signup: (name: string, email: string, password: string) =>
    api.post<User>("/auth/signup", { name, email, password }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<LoginResponse>("/auth/refresh", { refreshToken }).then((r) => r.data),
};

export const adminApi = {
  dashboard: () => api.get<DashboardStats>("/admin/dashboard").then((r) => r.data),
  users: () => api.get<User[]>("/admin/users").then((r) => r.data),
  drivers: () => api.get<User[]>("/admin/drivers").then((r) => r.data),
  createDriver: (payload: { name: string; email: string; password: string }) =>
    api.post<User>("/admin/drivers", { ...payload, role: "DRIVER" }).then((r) => r.data),
  students: () => api.get<User[]>("/admin/students").then((r) => r.data),
  buses: () => api.get<Bus[]>("/admin/buses").then((r) => r.data),
  createBus: (busNumber: string, driverId?: number) =>
    api.post<Bus>("/admin/buses", { busNumber, driverId }).then((r) => r.data),
  updateBus: (id: number, payload: { busNumber?: string; driverId?: number }) =>
    api.put<Bus>(`/admin/buses/${id}`, payload).then((r) => r.data),
  deleteBus: (id: number) => api.delete(`/admin/buses/${id}`),
  routes: () => api.get<Route[]>("/admin/routes").then((r) => r.data),
  updateRouteStopLocation: (routeId: number, stopId: number, latitude: number, longitude: number) =>
    api.put<Stop>(`/admin/routes/${routeId}/stops/${stopId}/location`, { latitude, longitude }).then((r) => r.data),
  stopSuggestions: () => api.get<StopSuggestion[]>("/admin/stop-suggestions").then((r) => r.data),
  approveStopSuggestion: (id: number) => api.post<StopSuggestion>(`/admin/stop-suggestions/${id}/approve`).then((r) => r.data),
  rejectStopSuggestion: (id: number) => api.post<StopSuggestion>(`/admin/stop-suggestions/${id}/reject`).then((r) => r.data),
  trips: () => api.get<Trip[]>("/admin/trips").then((r) => r.data),
  history: (busId: number) => api.get(`/admin/buses/${busId}/history`).then((r) => r.data),
};

export const studentApi = {
  buses: () => api.get<Bus[]>("/buses").then((r) => r.data),
  routes: (busId: number) => api.get<Route[]>(`/buses/${busId}/routes`).then((r) => r.data),
  stops: (busId: number) => api.get<Stop[]>(`/buses/${busId}/stops`).then((r) => r.data),
  requestStop: (routeId: number, payload: { stopName: string; latitude: number; longitude: number }) =>
    api.post<StopSuggestion>(`/student/route/${routeId}/stops`, payload).then((r) => r.data),
  selectStop: (busId: number, stopId: number) =>
    api.post<StudentStop>("/student/select-stop", { busId, stopId }).then((r) => r.data),
  tracking: (busId: number) => api.get<TrackingResponse>(`/student/tracking/${busId}`).then((r) => r.data),
  eta: (stopId: number) => api.get<EtaResponse>(`/stop/${stopId}/eta`).then((r) => r.data),
};

export const driverApi = {
  bus: () => api.get<Bus>("/driver/bus").then((r) => r.data),
  routes: () => api.get<Route[]>("/driver/routes").then((r) => r.data),
  createRoute: (payload: {
    routeName: string;
    busId: number;
    stops: { stopName: string; latitude: number; longitude: number; sequenceOrder: number }[];
  }) => api.post<Route>("/driver/route", payload).then((r) => r.data),
  updateRoute: (routeId: number, routeName: string) =>
    api.put<Route>(`/driver/route/${routeId}`, { routeName }).then((r) => r.data),
  saveRouteContents: (routeId: number, payload: {
    routeName: string;
    stops: { id?: number; stopName: string; latitude: number; longitude: number }[];
  }) => api.put<Route>(`/driver/route/${routeId}/contents`, payload).then((r) => r.data),
  deleteRoute: (routeId: number) => api.delete(`/driver/route/${routeId}`),
  addStop: (payload: { routeId: number; stopName: string; latitude: number; longitude: number; sequenceOrder: number }) =>
    api.post<Stop>("/driver/stop", payload).then((r) => r.data),
  updateStop: (stopId: number, payload: { stopName?: string; latitude?: number; longitude?: number; sequenceOrder?: number }) =>
    api.put<Stop>(`/driver/stop/${stopId}`, payload).then((r) => r.data),
  deleteStop: (stopId: number) => api.delete(`/driver/stop/${stopId}`),
  startTrip: (busId: number, routeId?: number) =>
    api.post<Trip>("/driver/trip/start", { busId, routeId }).then((r) => r.data),
  pauseTrip: (tripId: number) => api.post<Trip>(`/driver/trip/${tripId}/pause`).then((r) => r.data),
  resumeTrip: (tripId: number) => api.post<Trip>(`/driver/trip/${tripId}/resume`).then((r) => r.data),
  endTrip: (tripId: number) => api.post<Trip>(`/driver/trip/${tripId}/end`).then((r) => r.data),
  currentTrip: () => api.get<CurrentTripResponse>("/driver/trip/current").then((r) => r.data),
  sendLocation: (busId: number, payload: { latitude: number; longitude: number; accuracy?: number; timestamp?: string }) =>
    api.post<TrackingResponse>(`/bus/${busId}/location`, payload).then((r) => r.data),
};
