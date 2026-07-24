/**
 * exampleUsage.js
 * -----------------------------------------------------------------------
 * NOT part of the game — this is a runnable demo showing Replit AI (or
 * any dev) exactly how the UI layer should hook into the engine's events.
 * Run with: node exampleUsage.js
 * -----------------------------------------------------------------------
 */

const { GameState, generatePlayerName } = require('./index');

const players = [
  { id: 'p1', name: generatePlayerName() },
  { id: 'p2', name: generatePlayerName() },
  { id: 'p3', name: generatePlayerName() },
];

const game = new GameState({ players, mode: 'multiplayer' });

game.on('match-start', ({ firstPlayer }) => {
  console.log(`\n=== Match starting! First player: ${firstPlayer.name} ===`);
});

game.on('turn-start', ({ player, question, difficulty }) => {
  console.log(`\n[Turn] ${player.name}'s turn (difficulty ${difficulty})`);
  console.log(`  Question (${question.topic}): ${question.prompt}`);
  // UI would render question.choices as buttons here.
});

game.on('timer-tick', ({ secondsLeft, isCritical }) => {
  // UI drives background-flash intensity + ticking SFX speed off this.
  if (secondsLeft <= 3) {
    console.log(`  ...${secondsLeft}s left! ${isCritical ? '(FLASHING INTENSELY)' : ''}`);
  }
});

game.on('answer-correct', ({ player }) => {
  console.log(`  ✅ ${player.name} answered correctly! Bomb passes on.`);
});

game.on('answer-wrong', ({ player }) => {
  console.log(`  ❌ ${player.name} answered wrong!`);
});

game.on('answer-timeout', ({ player }) => {
  console.log(`  ⏰ ${player.name} ran out of time!`);
});

game.on('player-eliminated', ({ player }) => {
  console.log(`  💥 ${player.name} is eliminated!`);
});

game.on('cycle-complete', ({ round, difficulty }) => {
  console.log(`\n-- Cycle complete. Round ${round}, difficulty now ${difficulty} --`);
});

game.on('game-over', ({ winner }) => {
  console.log(`\n=== GAME OVER === Winner: ${winner ? winner.name : 'None (draw)'}`);
  process.exit(0);
});

game.start();

// Simulate players answering (in a real UI this comes from click/tap events).
// Here we just auto-answer correctly every 2 seconds for demo purposes.
setInterval(() => {
  const active = game._activePlayer();
  if (active && game.currentQuestion) {
    game.submitAnswer(active.id, game.currentQuestion.answer);
  }
}, 2000);
