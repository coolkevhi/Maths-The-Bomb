import React, { useEffect, useState } from "react";
import { socket } from "../socket";
import { playClick } from "../audio/audio";

export default function LobbyScreen({ room, player, onGameStart, onLeave }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (updatedRoom) => {
      if (onGameStart) onGameStart(updatedRoom);
    };

    const handleRoomUpdated = (updatedRoom) => {
      // Keep track of room state updates
    };

    socket.on("game_started", handleGameStarted);
    socket.on("room_updated", handleRoomUpdated);

    return () => {
      socket.off("game_started", handleGameStarted);
      socket.off("room_updated", handleRoomUpdated);
    };
  }, [onGameStart]);

  const handleToggleReady = () => {
    playClick();
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    socket.emit("toggle_ready", {
      code: room?.code,
      playerId: player?.id,
      isReady: newReadyState,
    });
  };

  const handleStartGame = () => {
    playClick();
    socket.emit("start_game", { code: room?.code });
  };

  const players = room?.players || [];
  const isHost = room?.hostId === player?.id;
  const allReady = players.length >= 2 && players.every((p) => p.isReady || p.id === room?.hostId);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-6 rounded-2xl shadow-xl w-full max-w-md text-center border border-slate-700">
        <h2 className="text-xl text-slate-400 font-bold uppercase tracking-wider mb-1">
          Lobby Code
        </h2>
        <div className="text-4xl font-extrabold text-amber-400 tracking-widest mb-6 bg-slate-900/50 py-2 rounded-lg border border-amber-500/20">
          {room?.code || "----"}
        </div>

        <h3 className="text-lg font-semibold text-slate-300 mb-3 text-left">
          Players ({players.length})
        </h3>
        <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center bg-slate-700/50 p-3 rounded-lg border border-slate-600"
            >
              <span className="font-medium">
                {p.name} {p.id === room?.hostId && "👑"}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                  p.id === room?.hostId
                    ? "bg-amber-500/20 text-amber-300"
                    : p.isReady
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-600 text-slate-400"
                }`}
              >
                {p.id === room?.hostId ? "Host" : p.isReady ? "Ready" : "Waiting"}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {!isHost ? (
            <button
              onClick={handleToggleReady}
              className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                isReady
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
              }`}
            >
              {isReady ? "READY!" : "SET READY"}
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              disabled={!allReady}
              className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                allReady
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              START GAME
            </button>
          )}

          <button
            onClick={onLeave}
            className="w-full py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-semibold transition-all"
          >
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
