export type Role = "ADMIN" | "DRIVER" | "STUDENT";
export type BusStatus = "IDLE" | "ACTIVE" | "PAUSED" | "OFFLINE";
export type TripStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
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
  busId: number;
  stops: Stop[];
}

export interface Trip {
  id: number;
  busId: number;
  routeId: number;
  routeName: string;
  status: TripStatus;
}

export interface CurrentTripResponse {
  currentTrip: Trip | null;
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
  lastUpdated: string | null;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}
