import { io } from "socket.io-client";

// Connect to backend server (auto-detects port or defaults to localhost:3000)
const SOCKET_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:3000`
    : "http://localhost:3000");

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});
