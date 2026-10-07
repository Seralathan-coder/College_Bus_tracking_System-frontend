export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
export const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";
export const TOKEN_KEY = "cbt_access_token";
export const USER_KEY = "cbt_user";
export const DEFAULT_REGION = {
  latitude: 11.341,
  longitude: 77.7172,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};
export const OSM_TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
