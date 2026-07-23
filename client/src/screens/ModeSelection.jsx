import React from 'react';
import { playClick, playHover } from '../audio/audio.js';

const modes = [
  { id: 'quick',       icon: '⚡', label: 'Quick Match',    desc: 'Jump in with strangers online' },
  { id: 'join',        icon: '🔑', label: 'Enter Code',     desc: 'Join a friend\'s private room' },
  { id: 'create',      icon: '🏠', label: 'Create Lobby',   desc: 'Host a private room' },
  { id: 'bots',        icon: '🤖', label: 'Play with Bots', desc: 'Practice against AI players' },
  { id: 'singleplayer',icon: '🧠', label: 'Singleplayer',  desc: 'Solo survival mode' },
];

export default function ModeSelection({ nav }) {
  function pick(mode) {
    playClick();
    const needsDifficulty = mode === 'singleplayer' || mode === 'create' || mode === 'bots';
    if (needsDifficulty) {
      nav('difficulty', { mode });
    } else {
      nav('lobby', { mode });
    }
  }

  return (
    <div className="screen" style={{ gap: 32 }}>
      <div className="logo" style={{ fontSize: '2rem' }}>Select Mode</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 640 }}>
        {modes.map((m) => (
          <button
            key={m.id}
            className="btn"
            style={{ flexDirection: 'column', gap: 6, minWidth: 160, padding: '18px 24px' }}
            onClick={() => pick(m.id)}
            onMouseEnter={playHover}
          >
            <span style={{ fontSize: '2rem' }}>{m.icon}</span>
            <span style={{ fontWeight: 700 }}>{m.label}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.65, fontWeight: 400, textTransform: 'none' }}>{m.desc}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-sm" onClick={() => { playClick(); nav('main-menu'); }} onMouseEnter={playHover}>
          ← Back
        </button>
        <button className="btn btn-sm" onClick={() => { playClick(); nav('stats'); }} onMouseEnter={playHover}>
          📊 Stats
        </button>
      </div>
    </div>
  );
}
