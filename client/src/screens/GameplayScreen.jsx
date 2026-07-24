import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import BombSVG from '../components/BombSVG.jsx';
import PlayerHand from '../components/PlayerHand.jsx';
import QuestionDisplay from '../components/QuestionDisplay.jsx';
import ExplosionVFX from '../components/ExplosionVFX.jsx';
import { PlayerWallet } from '../engine/economy.js';
import {
  startTicking, updateTickRate, stopTicking,
  playExplosion, playCorrect, playWrong, playPassBomb,
  startMatchMusic, stopAllMusic, playClick, playHover
} from '../audio/audio.js';
import '../styles/GameplayScreen.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlayerCosmetics() {
  try {
    const w = PlayerWallet.load();
    return {
      hand:              w.equipped.hand              || 'hand_blue',
      bomb:              w.equipped.bomb              || 'bomb_default',
      handAnimation:     w.equipped.handAnimation     || 'anim_default',
      handIdleAnimation: w.equipped.handIdleAnimation || 'idle_still',
    };
  } catch (_) {
    return { hand: 'hand_blue', bomb: 'bomb_default', handAnimation: 'anim_default', handIdleAnimation: 'idle_still' };
  }
}

/** Compute (x, y) center of player slot i out of n, around a circle */
function playerPos(i, n, cx, cy, rx, ry) {
  const angle = (2 * Math.PI * i) / n - Math.PI / 2;
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
}

// Maps pass animation IDs to bomb wrapper CSS animation strings
const BOMB_PASS_ANIM = {
  anim_spin:       'handSpin 0.5s linear infinite',
  anim_slam:       'handSlam 0.4s ease-in-out infinite alternate',
  anim_pulse:      'handPulse 0.5s ease-in-out infinite',
  anim_shake:      'handShake 0.12s ease-in-out infinite',
  anim_float:      'handFloat 1s ease-in-out infinite',
  anim_wobble:     'handWobble 0.5s ease-in-out infinite',
  anim_bounce_big: 'handBounceBig 0.6s ease-in-out infinite',
  anim_flash:      'handFlash 0.4s ease-in-out infinite',
  anim_orbit:      'handOrbit 0.9s linear infinite',
  anim_glitch:     'handGlitch 0.25s steps(3) infinite',
  anim_twist:      'handTwist 0.6s ease-in-out infinite',
  anim_heartbeat:  'handHeartbeat 0.7s ease-in-out infinite',
  anim_rubber:     'handRubber 0.5s ease-in-out infinite',
  anim_jitter:     'handJitter 0.08s linear infinite',
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function GameplayScreen({ gameData, mode, nav }) {
  const { players: initialPlayers = [], myPlayerId, firstPlayer } = gameData || {};
  const myCosmetics = getPlayerCosmetics();

  // ── State ───────────────────────────────────────────────────────────────────
  const [players, setPlayers]           = useState(initialPlayers);
  const [activePId, setActivePId]       = useState(firstPlayer?.id || null);
  const [question, setQuestion]         = useState(null);
  const [difficulty, setDifficulty]     = useState(1);
  const [timer, setTimer]               = useState({ secondsLeft: 0, pctLeft: 1, isCritical: false });
  const [bombPId, setBombPId]           = useState(null);
  const [eliminated, setEliminated]     = useState(new Set());
  const [explosions, setExplosions]     = useState([]);
  const [roundBeat, setRoundBeat]       = useState(false);
  const [myTyping, setMyTyping]         = useState(null);
  const [peerTyping, setPeerTyping]     = useState({});
  const [introAnim, setIntroAnim]       = useState(true);
  const [isSpectator, setIsSpectator]   = useState(false);
  const [gameOver, setGameOver]         = useState(false);
  // isPassing: true for a short window when the bomb arrives at a new player
  const [isPassing, setIsPassing]       = useState(false);
  const passingTimerRef                 = useRef(null);

  // Refs to avoid stale closures in socket handlers
  const activePIdRef  = useRef(activePId);   // always current activePId
  const difficultyRef = useRef(1);           // always current difficulty

  // Layout refs
  const arenaRef    = useRef(null);
  const [layout, setLayout] = useState({ cx: 200, cy: 200, rx: 170, ry: 130 });

  // ── Unmount Cleanup (Stops ghost ticking sound and background music) ───────
  useEffect(() => {
    return () => {
      stopTicking();
      stopAllMusic();
    };
  }, []);

  // ── Measure arena on mount + resize (With Mobile Scaling) ───────────────────
  useEffect(() => {
    function measure() {
      if (!arenaRef.current) return;
      const { width, height } = arenaRef.current.getBoundingClientRect();
      const isMobile = width <= 600;

      const rx = isMobile ? Math.min(width * 0.36, 135) : Math.min(width, height) * 0.34;
      const ry = isMobile ? Math.min(height * 0.28, 145) : Math.min(width, height) * 0.30;

      setLayout({
        cx: width / 2,
        cy: height / 2,
        rx,
        ry,
      });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── CSS flash intensity (driven by pctLeft) ──────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const opacity = timer.isCritical
      ? 0.0
      : Math.max(0, (1 - timer.pctLeft) * 0.3);
    root.style.setProperty('--flash-opacity', String(opacity));
    root.style.setProperty('--flash-speed', timer.isCritical ? '0.25s' : '0.5s');
    return () => { root.style.setProperty('--flash-opacity', '0'); };
  }, [timer.pctLeft, timer.isCritical]);

  // ── Helper: trigger the passing animation window ─────────────────────────
  function triggerPassingWindow() {
    if (passingTimerRef.current) clearTimeout(passingTimerRef.current);
    setIsPassing(true);
    passingTimerRef.current = setTimeout(() => setIsPassing(false), 800);
  }

  useEffect(() => () => { if (passingTimerRef.current) clearTimeout(passingTimerRef.current); }, []);

  // ── Socket handlers ──────────────────────────────────────────────────────
  const { emit } = useSocket({
    'match-start': ({ firstPlayer: fp, players: ps }) => {
      setPlayers(ps);
      setBombPId(null);
      setIntroAnim(true);
      setEliminated(new Set());
      setIsSpectator(false);
      setGameOver(false);
      setExplosions([]);
      setIsPassing(false);
      startMatchMusic();
      setTimeout(() => {
        activePIdRef.current = fp.id;
        setActivePId(fp.id);
        setBombPId(fp.id);
        setIntroAnim(false);
        startTicking(1);
      }, 1200);
    },

    'turn-start': ({ playerId, question: q, difficulty: d }) => {
      const prevActiveId = activePIdRef.current;
      const isRealPass = playerId !== prevActiveId;

      if (isRealPass) {
        playPassBomb();

        if (passingTimerRef.current) clearTimeout(passingTimerRef.current);
        setBombPId(playerId);
        setIsPassing(true);

        passingTimerRef.current = setTimeout(() => {
          activePIdRef.current = playerId;
          setActivePId(playerId);
          setIsPassing(false);
        }, 400);

        activePIdRef.current = playerId;
      } else {
        activePIdRef.current = playerId;
        setActivePId(playerId);
        setBombPId(playerId);
        setIsPassing(false);
      }

      setQuestion(q);
      setDifficulty(d);
      difficultyRef.current = d;
      setMyTyping(null);
      setPeerTyping({});
    },

    'timer-tick': (tick) => {
      setTimer(tick);
      updateTickRate(tick.pctLeft);
    },

    'answer-correct': ({ playerId }) => {
      if (playerId === myPlayerId) playCorrect();
    },

    'answer-wrong': ({ playerId }) => {
      if (playerId === myPlayerId) playWrong();
    },

    'answer-timeout': () => { playWrong(); },

    'player-eliminated': ({ playerId }) => {
      stopTicking();
      playExplosion();
      setEliminated((prev) => new Set([...prev, playerId]));

      if (arenaRef.current) {
        const n = players.length;
        const idx = players.findIndex((p) => p.id === playerId);
        if (idx >= 0) {
          const { x, y } = playerPos(idx, n, layout.cx, layout.cy, layout.rx, layout.ry);
          const eid = Date.now();
          setExplosions((prev) => [...prev, { id: eid, x, y }]);
        }
      }

      if (playerId === myPlayerId) setIsSpectator(true);
    },

    'cycle-complete': ({ round, difficulty: d }) => {
      if (d > difficultyRef.current) {
        difficultyRef.current = d;
        setDifficulty(d);
        setRoundBeat(true);
        setTimeout(() => setRoundBeat(false), 2000);
      }
    },

    'game-over': ({ winner, myStats }) => {
      stopTicking();
      stopAllMusic();
      setGameOver(true);
      setTimeout(() => {
        nav('end-game', { endData: { winner, myStats } });
      }, 1500);
    },

    'player-typing-update': ({ playerId, selection }) => {
      setPeerTyping((prev) => ({ ...prev, [playerId]: selection }));
    },
  });

  // ── Submit answer ────────────────────────────────────────────────────────
  const submitAnswer = useCallback((choice) => {
    if (activePId !== myPlayerId) return;
    emit('submit-answer', { answer: choice });
    setMyTyping(choice);
  }, [activePId, myPlayerId, emit]);

  function handleTyping(value) {
    if (activePId !== myPlayerId) return;
    setMyTyping(value);
    emit('player-typing', { selection: value });
  }

  // ── Bomb position ────────────────────────────────────────────────────────
  const n = players.length;
  const bombIdx = bombPId ? players.findIndex((p) => p.id === bombPId) : -1;
  const bombPos = bombIdx >= 0
    ? playerPos(bombIdx, n, layout.cx, layout.cy, layout.rx, layout.ry)
    : { x: layout.cx, y: layout.cy };

  const isMobileScreen = window.innerWidth <= 600;
  const BOMB_SIZE = isMobileScreen ? 46 : Math.max(56, Math.min(90, layout.rx * 0.45));

  const activePlayer = players.find((p) => p.id === activePId);

  const activeBombSkin = (() => {
    if (!activePlayer) return myCosmetics.bomb;
    if (activePlayer.id === myPlayerId) return myCosmetics.bomb;
    return activePlayer.cosmetics?.bomb || 'bomb_default';
  })();

  const activePassAnimId = activePlayer?.id === myPlayerId
    ? myCosmetics.handAnimation
    : (activePlayer?.cosmetics?.handAnimation || 'anim_default');
  const bombPassAnim = isPassing && BOMB_PASS_ANIM[activePassAnimId];
  const bombWrapperAnimation = bombPassAnim
    ? `bombFly 0.4s ease-out, ${bombPassAnim}`
    : undefined;

  const activePlayerSelection =
    activePId === myPlayerId ? myTyping : peerTyping[activePId] ?? null;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="gameplay-screen">
      <div className={`flash-overlay ${timer.isCritical ? 'critical' : ''}`} />

      {roundBeat && (
        <div className="round-beat-banner">
          🔺 Difficulty Up! Round {difficulty}
        </div>
      )}

      {gameOver && (
        <div className="gameover-flash">
          <span>💥 GAME OVER 💥</span>
        </div>
      )}

      <div className="gameplay-hud">
        <span className="hud-round">Round {difficulty}</span>
        <span className="hud-timer" style={{ color: timer.isCritical ? 'var(--danger)' : 'var(--green)' }}>
          ⏱ {timer.secondsLeft}s
        </span>
        <span className="hud-active">
          {activePlayer ? `🎯 ${activePlayer.name}` : '—'}
        </span>
      </div>

      <div className="gameplay-arena" ref={arenaRef}>

        {players.map((p, i) => {
          const pos      = playerPos(i, n, layout.cx, layout.cy, layout.rx, layout.ry);
          const isActive = p.id === activePId;
          const isElim   = eliminated.has(p.id);
          const isMe     = p.id === myPlayerId;
          const HAND_SIZE = isMobileScreen ? 36 : Math.max(44, Math.min(70, layout.rx * 0.35));

          return (
            <div
              key={p.id}
              className="player-slot"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
            >
              <PlayerHand
                skinId={isMe ? myCosmetics.hand : (p.cosmetics?.hand || 'hand_blue')}
                name={p.name}
                isActive={isActive}
                isEliminated={isElim}
                isMe={isMe}
                animId={isMe ? myCosmetics.handAnimation : (p.cosmetics?.handAnimation || 'anim_default')}
                idleAnimId={isMe ? myCosmetics.handIdleAnimation : (p.cosmetics?.handIdleAnimation || 'idle_still')}
                isPassing={isActive && isPassing}
                size={HAND_SIZE}
              />
              {peerTyping[p.id] && !isElim && !isActive && (
                <div className="typing-indicator">
                  thinking… {peerTyping[p.id]}
                </div>
              )}
            </div>
          );
        })}

        {!gameOver && (
          <div
            key={`bomb-${bombPId}`}
            className="bomb-wrapper"
            style={{
              left: bombPos.x,
              top:  bombPos.y,
              transform: 'translate(-50%, -80%)',
              ...(bombWrapperAnimation ? { animation: bombWrapperAnimation } : {}),
            }}
          >
            <BombSVG
              skinId={activeBombSkin}
              timerSecs={timer.secondsLeft}
              isCritical={timer.isCritical}
              size={BOMB_SIZE}
            />
          </div>
        )}

        {explosions.map((exp) => (
          <ExplosionVFX
            key={exp.id}
            x={exp.x}
            y={exp.y}
            onDone={() => setExplosions((prev) => prev.filter((e) => e.id !== exp.id))}
          />
        ))}
      </div>

      <div className="gameplay-question-panel">
        <QuestionDisplay
          question={question}
          isActivePlayer={activePId === myPlayerId && !isSpectator}
          onAnswer={submitAnswer}
          onTyping={handleTyping}
          selectedChoice={activePlayerSelection}
          difficulty={difficulty}
        />

        {isSpectator && (
          <div className="spectator-controls">
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: 8 }}>
              You were eliminated! 💀 Spectating…
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => { playClick(); emit('leave'); nav('main-menu'); }}
                onMouseEnter={playHover}
              >
                Leave
              </button>
              <button
                className="btn btn-sm"
                onClick={() => { playClick(); emit('leave'); nav('lobby', { mode }); }}
                onMouseEnter={playHover}
              >
                🔄 Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bombFly {
          0%   { opacity: 0.6; transform: translate(-50%, -80%) scale(0.7); }
          60%  { opacity: 1;   transform: translate(-50%, -80%) scale(1.15); }
          100% { opacity: 1;   transform: translate(-50%, -80%) scale(1); }
        }
      `}</style>
    </div>
  );
}