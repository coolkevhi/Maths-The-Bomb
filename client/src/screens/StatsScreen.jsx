import React from 'react';
import { loadStats, winRate } from '../engine/stats.js';
import { playClick, playHover } from '../audio/audio.js';

const MODES = [
  { key: 'singleplayer', label: '🧠 Singleplayer' },
  { key: 'bots',         label: '🤖 Bots'          },
  { key: 'multiplayer',  label: '🌐 Multiplayer'    },
];

export default function StatsScreen({ nav }) {
  const stats = loadStats();

  return (
    <div className="screen" style={{ gap: 28 }}>
      <div className="logo" style={{ fontSize: '2rem' }}>📊 Stats</div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        width: '100%',
        maxWidth: 720,
      }}>
        {MODES.map(({ key, label }) => {
          const s = stats[key];
          const played = s?.gamesPlayed ?? 0;
          const isSingleplayer = key === 'singleplayer';
          return (
            <div key={key} className="card" style={{ textAlign: 'left', gap: 0 }}>
              <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 10, fontSize: '1rem' }}>
                {label}
              </p>
              {played === 0 ? (
                <p style={{ opacity: 0.45, fontSize: '0.85rem' }}>No games played yet</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px 16px',
                  fontSize: '0.88rem',
                }}>
                  <span style={{ opacity: 0.65 }}>Games Played</span>
                  <span style={{ fontWeight: 700 }}>{s.gamesPlayed}</span>
                  {isSingleplayer ? (
                    <>
                      <span style={{ opacity: 0.65 }}>High Score</span>
                      <span style={{ fontWeight: 700, color: 'var(--green)' }}>{(s.highScore ?? 0).toLocaleString()}</span>
                      <span style={{ opacity: 0.65 }}>Total Score</span>
                      <span style={{ fontWeight: 700 }}>{(s.totalScore ?? 0).toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ opacity: 0.65 }}>Wins</span>
                      <span style={{ fontWeight: 700 }}>{s.wins}</span>
                      <span style={{ opacity: 0.65 }}>Win Rate</span>
                      <span style={{ fontWeight: 700, color: 'var(--green)' }}>{winRate(s)}%</span>
                    </>
                  )}
                  <span style={{ opacity: 0.65 }}>Best Rounds</span>
                  <span style={{ fontWeight: 700 }}>{s.bestRounds}</span>
                  <span style={{ opacity: 0.65 }}>Total Correct</span>
                  <span style={{ fontWeight: 700 }}>{s.totalCorrect}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="btn btn-sm"
        onClick={() => { playClick(); nav('mode-select'); }}
        onMouseEnter={playHover}
      >
        ← Back
      </button>
    </div>
  );
}