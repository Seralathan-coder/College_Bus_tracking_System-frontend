export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
export const WS_URL = `${API_URL}/ws`;
export const TOKEN_KEY = "cbt_access_token";
export const REFRESH_KEY = "cbt_refresh_token";
export const USER_KEY = "cbt_user";
export const DEFAULT_CENTER: [number, number] = [11.341, 77.7172];
