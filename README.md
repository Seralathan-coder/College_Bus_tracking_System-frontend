# College Bus Tracking — Frontend

Independent frontend workspace. Open `frontend/` or a child app in VS Code.

This folder contains **no Java**. It talks to the backend only through REST and STOMP WebSocket.

## Apps

| App | Path | Start |
| --- | --- | --- |
| Web (React + Vite) | `frontend/web` | `npm install` then `npm run dev` |
| Mobile (Expo) | `frontend/mobile` | `npm install` then `npx expo start` |

## Web

```powershell
cd web
npm install
npm run dev
```

URL: http://localhost:5173

Environment:

```
VITE_API_URL=http://localhost:8080
```

Copy `.env.example` to `.env` if needed.

## Mobile

```powershell
cd mobile
npm install
npx expo start
```

Environment:

```
EXPO_PUBLIC_API_URL=http://localhost:8080
```

On an Android **physical device**, `localhost` is the phone itself. Use your computer LAN IP:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:8080
```

Android emulator often uses `http://10.0.2.2:8080`.

Maps use OpenStreetMap tiles only (`react-native-maps` `UrlTile`). No Google Maps key is required.

## Auth

Login: `POST /api/auth/login`

The access token is stored (web: localStorage, mobile: AsyncStorage) and sent as `Authorization: Bearer ...`.

On HTTP 401 the token is cleared and the user is returned to login.

Protected screens are gated by role: ADMIN, DRIVER, STUDENT.
