/**
 * useSocket.js — manages the Socket.io connection and provides an event bus.
 *
 * IMPORTANT: getSocket() must never recreate the socket based on the
 * `disconnected` flag — that flag is `true` before the socket has ever
 * connected (autoConnect:false), so checking it caused a new socket instance
 * to be created on every screen mount, each one silently discarding the
 * previous connection attempt. The fix: create the socket exactly once; let
 * socket.connect() handle reconnection when needed.
 */
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let sharedSocket = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io({ path: '/socket.io', autoConnect: false });

    // ── Connection diagnostics ──────────────────────────────────────────────
    sharedSocket.on('connect', () => {
      console.log('[socket] Connected:', sharedSocket.id);
    });
    sharedSocket.on('connect_error', (err) => {
      console.error('[socket] Connection error:', err.message, err);
    });
    sharedSocket.on('disconnect', (reason) => {
      console.warn('[socket] Disconnected:', reason);
    });
  }
  return sharedSocket;
}

export function useSocket(handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) socket.connect();

    // Keep a reference to each wrapper so cleanup can remove exactly THIS
    // hook's listeners — not every listener on the event (which would
    // silently wipe out listeners registered by other mounted screens).
    const wrappers = Object.entries(handlersRef.current).map(([event]) => {
      const wrapper = (...args) => handlersRef.current[event]?.(...args);
      socket.on(event, wrapper);
      return [event, wrapper];
    });

    return () => {
      wrappers.forEach(([event, wrapper]) => socket.off(event, wrapper));
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit, socket: socketRef };
}
