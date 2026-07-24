import React, { useState } from 'react';
import MainMenu from './screens/MainMenu.jsx';
import ModeSelection from './screens/ModeSelection.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import GameplayScreen from './screens/GameplayScreen.jsx';
import EndOfGame from './screens/EndOfGame.jsx';
import CustomizeScreen from './screens/CustomizeScreen.jsx';
import HowToPlay from './screens/HowToPlay.jsx';
import DifficultySettings from './screens/DifficultySettings.jsx';
import StatsScreen from './screens/StatsScreen.jsx';
import Stars from './components/Stars.jsx';

/**
 * Global nav state.
 * gameData: { players, myPlayerId, roomCode } — set by LobbyScreen, consumed by GameplayScreen
 */
export default function App() {
  const [screen, setScreen] = useState('main-menu');
  const [pendingMode, setPendingMode] = useState(null);
  const [pendingDifficulty, setPendingDifficulty] = useState('medium');
  const [gameData, setGameData] = useState(null);  // carries lobby info into gameplay
  const [endData, setEndData] = useState(null);

  const nav = (s, extra = {}) => {
    if (extra.mode       !== undefined) setPendingMode(extra.mode);
    if (extra.difficulty !== undefined) setPendingDifficulty(extra.difficulty);
    if (s === 'lobby') {
      // Every fresh trip to the lobby starts clean by default. Only a caller
      // that explicitly supplies gameData (EndOfGame's rematch flow) keeps
      // it — otherwise a stale isRematch/roomCode from a previous game would
      // silently persist and break every future "start a new game" attempt.
      setGameData(extra.gameData !== undefined ? extra.gameData : null);
    } else if (extra.gameData !== undefined) {
      setGameData(extra.gameData);
    }
    if (extra.endData    !== undefined) setEndData(extra.endData);
    setScreen(s);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflowX: 'hidden',
overflowY: 'auto', background: 'var(--navy)' }}>
      <Stars />

      {screen === 'main-menu'   && <MainMenu nav={nav} />}
      {screen === 'mode-select' && <ModeSelection nav={nav} />}

      {screen === 'difficulty'  && (
        <DifficultySettings
          mode={pendingMode}
          onConfirm={(diff) => nav('lobby', { difficulty: diff })}
          onBack={() => nav('mode-select')}
        />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          mode={pendingMode}
          difficulty={pendingDifficulty}
          nav={nav}
          gameData={gameData}
        />
      )}

      {screen === 'gameplay' && (
        <GameplayScreen
          gameData={gameData}
          mode={pendingMode}
          nav={nav}
        />
      )}

      {screen === 'end-game' && (
        <EndOfGame
          data={endData}
          mode={pendingMode}
          gameData={gameData}
          nav={nav}
        />
      )}

      {screen === 'customize'   && <CustomizeScreen nav={nav} />}
      {screen === 'how-to-play' && <HowToPlay nav={nav} />}
      {screen === 'stats'       && <StatsScreen nav={nav} />}
    </div>
  );
}
