export type Role = "ADMIN" | "DRIVER" | "STUDENT";
export type BusStatus = "IDLE" | "ACTIVE" | "PAUSED" | "OFFLINE";
export type RouteStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type TripStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

export interface Bus {
  id: number;
  busNumber: string;
  driverId: number | null;
  driverName: string | null;
  currentLat: number | null;
  currentLng: number | null;
  currentSpeed: number | null;
  lastUpdated: string | null;
  status: BusStatus;
  createdAt: string;
}

export interface Stop {
  id: number;
  stopName: string;
  latitude: number;
  longitude: number;
  sequenceOrder: number;
  routeId: number;
}

export interface Route {
  id: number;
  routeName: string;
  driverId: number;
  driverName: string;
  busId: number;
  busNumber: string;
  status: RouteStatus;
  stops: Stop[];
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: number;
  busId: number;
  busNumber: string;
  routeId: number;
  routeName: string;
  driverId: number;
  driverName: string;
  startedAt: string;
  endedAt: string | null;
  status: TripStatus;
  createdAt: string;
}

export interface CurrentTripResponse {
  currentTrip: Trip | null;
}

export interface StopSuggestion {
  id: number;
  stopName: string;
  latitude: number;
  longitude: number;
  routeId: number;
  routeName: string;
  busNumber: string;
  studentId: number;
  studentName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface StudentStop {
  id: number;
  studentId: number;
  busId: number;
  stopId: number;
  stopName: string;
}

export interface TrackingResponse {
  busId: number;
  busNumber: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  distanceToNextStop: number | null;
  distanceToSelectedStop: number | null;
  etaMinutes: number | null;
  nextStop: string | null;
  currentStop: string | null;
  status: BusStatus;
  timestamp: string | null;
  lastUpdated: string | null;
}

export interface EtaResponse {
  stopId: number;
  stopName: string;
  distanceKm: number;
  speedKmh: number;
  etaMinutes: number;
  nextStop: string | null;
  lastUpdated: string | null;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface DashboardStats {
  totalBuses: number;
  activeBuses: number;
  offlineBuses: number;
  drivers: number;
  students: number;
  activeTrips: number;
}

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
