import React from 'react';
import { playClick, playHover } from '../audio/audio.js';
import '../styles/ModeSelection.css';

const modes = [
  { id: 'quick',        icon: '⚡', label: 'Quick Match',    desc: 'Jump in with strangers online' },
  { id: 'join',         icon: '🔑', label: 'Enter Code',     desc: "Join a friend's private room" },
  { id: 'create',       icon: '🏠', label: 'Create Lobby',   desc: 'Host a private room' },
  { id: 'bots',         icon: '🤖', label: 'Play with Bots', desc: 'Practice against AI players' },
  { id: 'singleplayer', icon: '🧠', label: 'Singleplayer',   desc: 'Solo survival mode' },
];

export default function ModeSelection({ nav }) {
  function pick(mode) {
    playClick();

    const needsDifficulty =
      mode === 'singleplayer' ||
      mode === 'create' ||
      mode === 'bots';

    if (needsDifficulty) {
      nav('difficulty', { mode });
    } else {
      nav('lobby', { mode });
    }
  }

  return (
    <div
      className="screen mode-select-screen"
      style={{
        justifyContent: "flex-start",
        overflowY: "auto",
        padding: "20px 20px 90px",
      }}
    >
      <div className="logo mode-select-title">
        Select Mode
      </div>

      <div className="mode-select-grid">
        {modes.map((m) => (
          <button
            key={m.id}
            className="btn mode-select-btn"
            onClick={() => pick(m.id)}
            onMouseEnter={playHover}
          >
            <span className="mode-select-icon">{m.icon}</span>
            <span className="mode-select-label">{m.label}</span>
            <span className="mode-select-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      <div
        className="mode-select-footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: "700px",
          marginTop: "20px",
          paddingBottom: "env(safe-area-inset-bottom)",
          gap: "12px",
        }}
      >
        <button
          className="btn btn-sm"
          onClick={() => {
            playClick();
            nav("main-menu");
          }}
          onMouseEnter={playHover}
        >
          ← Back
        </button>

        <button
          className="btn btn-sm"
          onClick={() => {
            playClick();
            nav("stats");
          }}
          onMouseEnter={playHover}
        >
          📊 Stats
        </button>
      </div>
    </div>
  );
}