import React from 'react';
import { playClick, playHover } from '../audio/audio.js';

const rules = [
  { icon: '💣', title: 'The Bomb Passes',        text: 'Players stand in a circle. On each turn, the bomb lands in your hands and a math question appears.' },
  { icon: '✅', title: 'Answer Correctly',         text: 'Solve the question and the bomb flies safely to the next player.' },
  { icon: '❌', title: 'Wrong Answer or Timeout', text: 'The bomb EXPLODES in your hands and you\'re eliminated. The same question then passes to the next player.' },
  { icon: '🔄', title: 'Cycles & Difficulty',     text: 'Each full round of turns is a cycle. After every cycle, the timer shrinks and questions get harder.' },
  { icon: '🏆', title: 'Last One Standing',        text: 'The final survivor wins! In Singleplayer, try to rack up the highest score before exploding.' },
  { icon: '💰', title: 'Earn Math Bits',           text: 'After each match, earn currency based on correct answers and rounds survived. Spend it in the Customize screen.' },
];

export default function HowToPlay({ nav }) {
  return (
    <div className="screen" style={{ overflowY: 'auto', justifyContent: 'flex-start', padding: '20px 20px 90px' }}>
      <div className="logo" style={{ fontSize: '2rem', marginBottom: 8 }}>How to Play</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 860, width: '100%', marginTop: 24 }}>
        {rules.map((r, i) => (
          <div key={i} className="card" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.5 }}>{r.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, padding: 20, background: 'var(--navy-mid)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 12, maxWidth: 600, textAlign: 'center' }}>
        <p style={{ color: 'var(--off-white)', fontSize: '0.95rem', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--green)' }}>Topics covered:</strong> Arithmetic (+, -, ×, ÷), Order of Operations (PEMDAS), Shapes, and Clock reading.
          Questions get harder as cycles progress!
        </p>
      </div>

      <button
        className="btn btn-lg"
        style={{ marginTop: 20,
marginBottom: 30 }}
        onClick={() => { playClick(); nav('main-menu'); }}
        onMouseEnter={playHover}
      >
        ← Back to Menu
      </button>
    </div>
  );
}
