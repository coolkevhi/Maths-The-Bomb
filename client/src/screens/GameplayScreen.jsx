import React, { useState, useEffect } from "react";
import { socket } from "../socket";
import {
  playCorrect,
  playWrong,
  playPassBomb,
  playExplosion,
  startTicking,
  updateTickRate,
  stopTicking,
  startMatchMusic,
  stopAllMusic,
} from "../audio/audio";

export default function GameplayScreen({ room: initialRoom, player, onGameOver }) {
  const [room, setRoom] = useState(initialRoom);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    startMatchMusic();

    const handleRoomUpdated = (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom?.pctLeft !== undefined) {
        updateTickRate(updatedRoom.pctLeft);
      }
    };

    const handleAnswerResult = ({ success, passerId }) => {
      if (success) {
        playCorrect();
        if (passerId === player?.id) {
          playPassBomb();
        }
      } else {
        playWrong();
      }
    };

    const handleExplosion = ({ eliminatedPlayerId, updatedRoom }) => {
      stopTicking();
      playExplosion();
      if (onGameOver) {
        onGameOver(eliminatedPlayerId, updatedRoom);
      }
    };

    socket.on("room_updated", handleRoomUpdated);
    socket.on("answer_result", handleAnswerResult);
    socket.on("explosion", handleExplosion);

    // Initial ticking setup
    if (room?.pctLeft !== undefined) {
      startTicking(room.pctLeft);
    }

    return () => {
      stopTicking();
      stopAllMusic();
      socket.off("room_updated", handleRoomUpdated);
      socket.off("answer_result", handleAnswerResult);
      socket.off("explosion", handleExplosion);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    socket.emit("submit_answer", {
      code: room?.code,
      playerId: player?.id,
      answer: answer.trim(),
    });

    setAnswer("");
  };

  const isMyTurn = room?.currentHolderId === player?.id;
  const currentHolder = room?.players?.find((p) => p.id === room?.currentHolderId);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-slate-950 text-white p-4">
      {/* Top Bar / Status */}
      <div className="w-full max-w-md flex justify-between items-center bg-slate-900/80 p-4 rounded-xl border border-slate-800 mt-2">
        <div>
          <span className="text-xs text-slate-400 block uppercase font-bold">Room</span>
          <span className="font-mono text-amber-400 font-bold">{room?.code}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block uppercase font-bold">Holder</span>
          <span className="font-semibold text-slate-200">
            {isMyTurn ? "YOU 💣" : currentHolder?.name || "Waiting..."}
          </span>
        </div>
      </div>

      {/* Bomb Display Area */}
      <div className="flex flex-col items-center my-auto text-center">
        <div
          className={`text-8xl mb-4 transition-transform ${
            isMyTurn ? "animate-bounce scale-110" : "opacity-80"
          }`}
        >
          💣
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl max-w-xs w-full">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            Solve Target
          </span>
          <div className="text-4xl font-black text-amber-400 tracking-wider">
            {room?.currentQuestion || "0 + 0"}
          </div>
        </div>
      </div>

      {/* Answer Form */}
      <div className="w-full max-w-md mb-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!isMyTurn}
            placeholder={isMyTurn ? "Enter answer..." : "Wait for your turn..."}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isMyTurn || !answer.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl disabled:opacity-50 disabled:hover:bg-amber-500 transition-all"
          >
            PASS 💣
          </button>
        </form>
      </div>
    </div>
  );
}
