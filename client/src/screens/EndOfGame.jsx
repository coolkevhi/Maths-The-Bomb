import React, { useEffect, useState } from 'react';
import { useSocket } from '../socket.js';
import { playClick, playHover, startMenuMusic } from '../audio/audio.js';
import { PlayerWallet } from '../engine/economy.js';
import { recordGame } from '../engine/stats.js';

export default function EndOfGame({ data, mode, gameData, nav }) {
  const { winner, myStats } = data || {};
  const [reward, setReward] = useState(null);
  const [wallet, setWallet] = useState(null);

  const { emit } = useSocket({
    'lobby-state': (lobbyData) => {
      // Host hit rematch — our existing lobby was reset server-side, so
      // pass its data back to LobbyScreen (isRematch flag) so it re-uses
      // this lobby instead of creating an unrelated new one. We deliberately
      // don't touch `mode` here — it needs to stay the real original mode
      // (e.g. 'bots'/'create') for later "Play Again" clicks to work right.
      nav('lobby', { mode, gameData: { ...gameData, ...lobbyData, isRematch: true } });
    },
  });

  useEffect(() => {
    startMenuMusic();
    if (myStats) {
      const w = PlayerWallet.load();
      const earned = w.addReward(myStats);
      setReward(earned);
      setWallet(w);
      // Persist per-mode stats to localStorage
      if (mode) recordGame(mode, myStats);
    }
  }, []);

  const amWinner = winner && gameData?.myPlayerId === winner.id;
  const isSingleplayer = mode === 'singleplayer';

  return (
    <div className="screen" style={{ gap: 28, textAlign: 'center' }}>
      {/* Result header */}
      <div>
        {isSingleplayer ? (
          <>
            <div style={{ fontSize: '5rem' }}>🧠</div>
            <div className="logo" style={{ fontSize: '2.5rem', marginTop: 8 }}>
              Run <span>Complete!</span>
            </div>
            {myStats?.score != null && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>
                  {myStats.score.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  points
                </div>
              </div>
            )}
          </>
        ) : amWinner ? (
          <>
            <div style={{ fontSize: '5rem', animation: 'bombBob 1.5s ease-in-out infinite' }}>🏆</div>
            <div className="logo" style={{ fontSize: '2.8rem', marginTop: 8 }}>
              You <span>Won!</span>
            </div>
            <p style={{ color: 'var(--off-white)', marginTop: 8, opacity: 0.8 }}>
              Congratulations, {winner?.name}!
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '5rem' }}>💥</div>
            <div className="logo" style={{ fontSize: '2.5rem', marginTop: 8 }}>
              Game Over
            </div>
            {winner ? (
              <p style={{ color: 'var(--off-white)', marginTop: 8, opacity: 0.8 }}>
                Winner: <strong style={{ color: 'var(--green)' }}>{winner.name}</strong>
              </p>
            ) : (
              <p style={{ color: 'var(--off-white)', opacity: 0.7 }}>No survivors!</p>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      {myStats && (
        <div className="card" style={{ minWidth: 260 }}>
          <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 10 }}>Your Stats</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: '0.9rem' }}>
            {isSingleplayer ? (
              <>
                <span style={{ opacity: 0.7 }}>Score</span>
                <span style={{ fontWeight: 700, color: 'var(--green)' }}>{(myStats.score || 0).toLocaleString()}</span>
                <span style={{ opacity: 0.7 }}>Correct Answers</span>
                <span style={{ fontWeight: 700 }}>{myStats.correctAnswers}</span>
                <span style={{ opacity: 0.7 }}>Rounds Reached</span>
                <span style={{ fontWeight: 700 }}>{myStats.survivedRounds}</span>
              </>
            ) : (
              <>
                <span style={{ opacity: 0.7 }}>Correct Answers</span>
                <span style={{ fontWeight: 700 }}>{myStats.correctAnswers}</span>
                <span style={{ opacity: 0.7 }}>Rounds Survived</span>
                <span style={{ fontWeight: 700 }}>{myStats.survivedRounds}</span>
              </>
            )}
            {reward !== null && (
              <>
                <span style={{ opacity: 0.7 }}>Math Bits Earned</span>
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>+{reward} 💰</span>
              </>
            )}
            {wallet && (
              <>
                <span style={{ opacity: 0.7 }}>Total Balance</span>
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{wallet.balance} 💰</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-lg" onClick={() => { playClick(); nav('main-menu'); }} onMouseEnter={playHover}>
          ← Main Menu
        </button>
        <button className="btn btn-lg" onClick={() => { playClick(); emit('leave'); nav('lobby', { mode }); }} onMouseEnter={playHover}>
          🔄 Play Again
        </button>
        {mode !== 'singleplayer' && mode !== 'quick' && (
          <button
            className="btn btn-lg btn-gold"
            onClick={() => { playClick(); emit('rematch'); }}
            onMouseEnter={playHover}
          >
            ⚔️ Rematch
          </button>
        )}
      </div>
    </div>
  );
}
