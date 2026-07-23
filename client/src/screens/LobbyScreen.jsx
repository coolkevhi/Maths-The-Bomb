import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import { playClick, playHover, stopAllMusic } from '../audio/audio.js';
import { PlayerWallet } from '../engine/economy.js';
import '../styles/LobbyScreen.css';

/** Load the local player's equipped cosmetics to share with the server. */
function loadCosmetics() {
  try {
    const w = PlayerWallet.load();
    return {
      bomb:              w.equipped.bomb              || 'bomb_default',
      hand:              w.equipped.hand              || 'hand_blue',
      handAnimation:     w.equipped.handAnimation     || 'anim_default',
      handIdleAnimation: w.equipped.handIdleAnimation || 'idle_still',
    };
  } catch (_) {
    return { bomb: 'bomb_default', hand: 'hand_blue', handAnimation: 'anim_default', handIdleAnimation: 'idle_still' };
  }
}

export default function LobbyScreen({ mode, difficulty, nav, gameData }) {
  // If we arrived here via a Rematch (server already reset our existing
  // lobby and sent its fresh state), seed from that instead of creating a
  // brand new unrelated room on mount.
  const isRematch = !!gameData?.isRematch && !!gameData?.roomCode;
  const [lobbyState, setLobbyState] = useState(isRematch ? gameData : null); // { roomCode, players, hostId, status, myPlayerId }
  const [error, setError] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('mtb_name') || '');
  const [joined, setJoined] = useState(isRematch);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);
  const [queueStatus, setQueueStatus] = useState(null); // { count, minPlayers, maxPlayers, secondsLeft }
  const navRef = useRef(nav);
  navRef.current = nav;

  const { emit } = useSocket({
    'lobby-state': (data) => {
      setLobbyState(data);
      setJoined(true);
      setError(null);
    },
    'queuing': ({ message }) => {
      setError(null);
      setJoined(true);
      setLobbyState(null);
    },
    'quick-match-status': (status) => {
      setQueueStatus(status);
    },
    'error': ({ message }) => {
      setError(message);
    },
    // match-starting fires first (clients navigate); match-start fires 1.2s later (in GameplayScreen)
    'match-starting': ({ players, myPlayerId, roomCode }) => {
      stopAllMusic();
      navRef.current('gameplay', {
        gameData: { players, myPlayerId, roomCode },
      });
    },
  });

  // Guard against React StrictMode's intentional double-invoke (mount →
  // unmount → remount in dev), which would fire the emit twice and create
  // two separate rooms/games for the same session.
  const hasJoinedRef = useRef(false);

  // Join on mount
  useEffect(() => {
    if (isRematch) return; // already in a reset lobby — don't spin up a new room
    if (hasJoinedRef.current) return; // StrictMode double-invoke guard
    hasJoinedRef.current = true;

    const name = playerName.trim() || undefined;
    const cosmetics = loadCosmetics();
    if (mode === 'singleplayer') {
      emit('create-singleplayer', { playerName: name, difficulty, cosmetics });
    } else if (mode === 'create') {
      emit('create-lobby', { playerName: name, difficulty, cosmetics });
    } else if (mode === 'bots') {
      emit('play-with-bots', { playerName: name, botCount: 3, difficulty, cosmetics });
    } else if (mode === 'quick') {
      emit('quick-match', { playerName: name, cosmetics });
    }
    // 'join' handled by user submitting the code form
  }, []); // eslint-disable-line

  function handleJoinCode(e) {
    e.preventDefault();
    const name = playerName.trim() || undefined;
    const cosmetics = loadCosmetics();
    emit('join-lobby', { playerName: name, code: inputCode.toUpperCase(), cosmetics });
  }

  function handleStart() {
    playClick();
    emit('lobby-start');
  }

  function handleLeave() {
    playClick();
    emit('leave');
    nav('main-menu');
  }

  const isHost = lobbyState && lobbyState.myPlayerId === lobbyState.hostId;

  /* ── Join Code form (only before joining) ─────────────────────────────── */
  if (mode === 'join' && !joined) {
    return (
      <div className="screen" style={{ gap: 20 }}>
        <div className="logo" style={{ fontSize: '2rem' }}>Enter Room Code</div>
        <form onSubmit={handleJoinCode} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 300 }}>
          <input
            className="input"
            placeholder="Your name (optional)"
            value={playerName}
            onChange={(e) => { setPlayerName(e.target.value); localStorage.setItem('mtb_name', e.target.value); }}
            maxLength={20}
          />
          <input
            className="input"
            placeholder="Room code  e.g. AB3KL"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            maxLength={5}
            style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.4rem', textAlign: 'center' }}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</p>}
          <button type="submit" className="btn btn-lg" onMouseEnter={playHover}>Join →</button>
          <button type="button" className="btn btn-sm" onClick={() => { playClick(); nav('mode-select'); }} onMouseEnter={playHover}>← Back</button>
        </form>
      </div>
    );
  }

  /* ── Queuing spinner ───────────────────────────────────────────────────── */
  if (mode === 'quick' && joined && !lobbyState) {
    const found = queueStatus?.count ?? 1;
    const cap = queueStatus?.maxPlayers;
    const secondsLeft = queueStatus?.secondsLeft;
    return (
      <div className="screen" style={{ gap: 24 }}>
        <div className="logo" style={{ fontSize: '2rem' }}>Finding a Match…</div>
        <div className="lobby-spinner" />
        {secondsLeft != null ? (
          <>
            <p style={{ opacity: 0.85 }}>
              {found}{cap ? ` / ${cap}` : ''} player{found === 1 ? '' : 's'} found
            </p>
            <p style={{ opacity: 0.65 }}>Starting in {secondsLeft}s…</p>
          </>
        ) : (
          <p style={{ opacity: 0.65 }}>Searching for other players…</p>
        )}
        <button className="btn btn-sm btn-danger" onClick={handleLeave} onMouseEnter={playHover}>Cancel</button>
      </div>
    );
  }

  /* ── Lobby waiting room ────────────────────────────────────────────────── */
  if (!lobbyState) {
    return (
      <div className="screen" style={{ gap: 20 }}>
        <div className="logo" style={{ fontSize: '2rem' }}>Connecting…</div>
        <div className="lobby-spinner" />
      </div>
    );
  }

  const { roomCode, players, hostId, myPlayerId } = lobbyState;

  return (
    <div className="screen lobby-screen">
      <div className="lobby-header">
        <div className="logo" style={{ fontSize: '2rem' }}>Lobby</div>
        {roomCode && mode !== 'singleplayer' && mode !== 'bots' && (
          <div className="lobby-code-display">
            Room code: <span className="lobby-code">{roomCode}</span>
          </div>
        )}
      </div>

      {/* Player list */}
      <div className="lobby-players">
        {players.map((p) => (
          <div key={p.id} className={`lobby-player ${p.id === myPlayerId ? 'lobby-player--me' : ''}`}>
            <span className="lobby-player-icon">{p.isBot ? '🤖' : '👤'}</span>
            <span className="lobby-player-name">
              {p.name}
              {p.id === myPlayerId && <span className="badge-you"> (you)</span>}
              {p.id === hostId     && <span className="badge-host"> 👑</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Host controls */}
      {isHost && mode !== 'singleplayer' && mode !== 'bots' && (
        <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>
          {players.length < 2 ? 'Waiting for at least 2 players…' : 'Ready to start!'}
        </p>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Singleplayer and bots auto-start on the server; show the button
            but disable it only for hosted lobbies that need ≥2 humans. */}
        {(isHost || mode === 'singleplayer' || mode === 'bots') && (
          <button
            className="btn btn-lg"
            disabled={mode !== 'singleplayer' && mode !== 'bots' && players.length < 2}
            onClick={handleStart}
            onMouseEnter={playHover}
          >
            {mode === 'singleplayer' ? '▶ Start Game' : '▶ Start Match'}
          </button>
        )}
        {!isHost && mode !== 'singleplayer' && (
          <p style={{ opacity: 0.6 }}>Waiting for host to start…</p>
        )}
        <button className="btn btn-sm btn-danger" onClick={handleLeave} onMouseEnter={playHover}>
          Leave
        </button>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}