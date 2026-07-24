import React, { useState } from 'react';
import { playClick, playHover } from '../audio/audio.js';

const DIFFICULTIES = [
  { id: 'easy',   label: '🟢 Easy',   desc: 'More time, simpler questions' },
  { id: 'medium', label: '🟡 Medium', desc: 'Balanced challenge' },
  { id: 'hard',   label: '🔴 Hard',   desc: 'Less time, tougher math' },
];

export default function DifficultySettings({ mode, onConfirm, onBack }) {
  const [selected, setSelected] = useState('medium');

  return (
    <div className="screen" style={{ gap: 28 }}>
      <div className="logo" style={{ fontSize: '2rem' }}>Difficulty</div>
      <p style={{ opacity: 0.65, fontSize: '0.95rem' }}>
        {mode === 'singleplayer' ? 'Solo mode — how hard do you want it?' : 'Chosen by the host for all players.'}
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className="btn"
            style={{
              flexDirection: 'column', gap: 8, minWidth: 140, padding: '18px 24px',
              borderColor: selected === d.id ? 'var(--green)' : 'rgba(0,255,136,0.3)',
              boxShadow: selected === d.id ? 'var(--shadow-glow)' : 'none',
            }}
            onClick={() => { playClick(); setSelected(d.id); }}
            onMouseEnter={playHover}
          >
            <span style={{ fontSize: '1.4rem' }}>{d.label}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.65, fontWeight: 400, textTransform: 'none' }}>{d.desc}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <button className="btn btn-sm" onClick={() => { playClick(); onBack(); }} onMouseEnter={playHover}>← Back</button>
        <button className="btn btn-lg" onClick={() => { playClick(); onConfirm(selected); }} onMouseEnter={playHover}>
          Continue →
        </button>
      </div>
    </div>
  );
}
