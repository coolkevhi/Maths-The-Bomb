import React, { useEffect, useRef, useState } from 'react';
import { playClick, playHover, startMenuMusic, toggleMenuMusicMute, isMenuMusicMuted } from '../audio/audio.js';
import '../styles/MainMenu.css';

export default function MainMenu({ nav }) {
  const started = useRef(false);
  const [muted, setMuted] = useState(isMenuMusicMuted());

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      startMenuMusic();
    }
  }, []);

  function handleMuteToggle() {
    const nowMuted = toggleMenuMusicMute();
    setMuted(nowMuted);
  }

  function btn(label, handler) {
    return (
      <button
        className="btn btn-lg main-menu-btn"
        onClick={() => { playClick(); handler(); }}
        onMouseEnter={playHover}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="screen main-menu-screen">
      {/* Mute button — top-right corner */}
      <button
        className="menu-mute-btn"
        onClick={handleMuteToggle}
        title={muted ? 'Unmute music' : 'Mute music'}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Title */}
      <div className="main-menu-title">
        <div className="logo">
          Maths The <span>Bomb</span>
          <span className="logo-bomb">💣</span>
        </div>
        <p className="main-menu-tagline">Pass the bomb · Solve the math · Last one standing wins</p>
      </div>

      {/* Buttons */}
      <div className="main-menu-buttons">
        {btn('▶  Play',         () => nav('mode-select'))}
        {btn('🎨  Customize',   () => nav('customize'))}
        {btn('❓  How to Play', () => nav('how-to-play'))}
      </div>

      {/* Floating decorative bombs */}
      <span className="deco-bomb deco-bomb--1" aria-hidden="true">💣</span>
      <span className="deco-bomb deco-bomb--2" aria-hidden="true">💣</span>
      <span className="deco-bomb deco-bomb--3" aria-hidden="true">💥</span>
    </div>
  );
}
