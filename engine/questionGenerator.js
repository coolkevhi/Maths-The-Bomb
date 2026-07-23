/**
 * questionGenerator.js
 * -----------------------------------------------------------------------
 * Generates elementary-level math questions for "Maths The Bomb".
 * Covers: PEMDAS, Shapes, Clocks/Time-telling, Arithmetic (add/sub/mul/div)
 *
 * Difficulty is an integer starting at 1 and increasing:
 *   - every correct answer in Singleplayer
 *   - every full cycle (all active players have had a turn) in Multiplayer
 *
 * This module has NO UI dependencies. Replit AI should call
 * generateQuestion() and render the returned object however it likes.
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds a multiple-choice answer set around a correct numeric answer.
 * Guarantees uniqueness and no negative distractors for young learners.
 */
function buildChoices(correctAnswer, spread = 5) {
  const choices = new Set([correctAnswer]);
  let attempts = 0;
  while (choices.size < 4) {
    attempts++;
    // Widen spread if we're stuck (e.g. spread too small, or correctAnswer
    // is negative so only a narrow band of offsets differ from it).
    if (attempts > 80) spread = Math.max(spread + 2, 5);
    const offset = randInt(-spread, spread);
    if (offset === 0) continue;          // must differ from correct answer
    choices.add(correctAnswer + offset); // allow negatives — no >= 0 filter
  }
  return shuffle([...choices]);
}

// ---------------------------------------------------------------------
// Difficulty scaling curves (per topic)
// Each returns the numeric ranges/complexity to use for a given level.
// Tune these freely — they are the single source of truth for balancing.
// ---------------------------------------------------------------------

function arithmeticRange(difficulty) {
  // difficulty 1-3: small numbers, single operation
  // difficulty 4-6: bigger numbers
  // difficulty 7+: bigger numbers, more digits
  if (difficulty <= 3) return { min: 1, max: 10 };
  if (difficulty <= 6) return { min: 5, max: 25 };
  if (difficulty <= 9) return { min: 10, max: 50 };
  return { min: 20, max: 100 };
}

function pemdasComplexity(difficulty) {
  // returns how many operators to chain together
  if (difficulty <= 3) return 2; // e.g. 3 + 4 * 2
  if (difficulty <= 6) return 3; // e.g. (3 + 4) * 2 - 1
  return 4; // e.g. (3 + 4) * (2 - 1) + 5
}

// ---------------------------------------------------------------------
// Topic: Arithmetic (Addition / Subtraction / Multiplication / Division)
// ---------------------------------------------------------------------

function generateArithmetic(difficulty) {
  const { min, max } = arithmeticRange(difficulty);
  // Introduce operations gradually so easy difficulty stays simple.
  // diff 1-2: addition only
  // diff 3-4: addition + subtraction
  // diff 5-7: keep multiplication out while numbers get a little larger
  // diff 8-9: add multiplication
  // diff 10+: all four (including division)
  const ops =
    difficulty <= 2 ? ['+'] :
    difficulty <= 4 ? ['+', '-'] :
    difficulty <= 7 ? ['+', '-'] :
    difficulty <= 11 ? ['+', '-', '*'] :
    ['+', '-', '*', '/'];
  const op = pick(ops);

  let a, b, answer, promptText;

  switch (op) {
    case '+':
      a = randInt(min, max);
      b = randInt(min, max);
      answer = a + b;
      promptText = `${a} + ${b}`;
      break;
    case '-':
      a = randInt(min, max);
      b = randInt(min, a); // avoid negative results
      answer = a - b;
      promptText = `${a} - ${b}`;
      break;
    case '*':
      // Multiplication arrives late and uses capped factors so it ramps in
      // as table practice rather than suddenly creating huge answers.
      a = randInt(Math.min(min, 8), Math.min(max, 12));
      b = randInt(2, difficulty >= 10 ? 12 : 9);
      answer = a * b;
      promptText = `${a} \u00D7 ${b}`;
      break;
    case '/':
      b = randInt(2, 12);
      answer = randInt(min, Math.min(max, 12));
      a = answer * b; // ensures whole-number division
      promptText = `${a} \u00F7 ${b}`;
      break;
  }

  return {
    topic: 'arithmetic',
    prompt: promptText,
    answer,
    choices: buildChoices(answer, Math.max(3, Math.round(answer * 0.2))),
  };
}

// ---------------------------------------------------------------------
// Topic: PEMDAS (Order of Operations)
// ---------------------------------------------------------------------

function generatePemdas(difficulty) {
  const complexity = pemdasComplexity(difficulty);
  const numRange = difficulty <= 5 ? [1, 9] : [1, 12];

  // Build an expression as an array of tokens, then evaluate with JS eval
  // (safe here because every token is generated by us, never user input).
  let tokens = [randInt(numRange[0], numRange[1])];
  // Gate operators by difficulty — no multiplication in early PEMDAS questions.
  // diff ≤ 4: + and - only (order-of-operations still applies with parens)
  // diff 5-7: + and - only
  // diff 8-9: add *
  // diff 10+: division can join the late-game mix
  const ops =
    difficulty <= 7 ? ['+', '-'] :
    difficulty <= 11 ? ['+', '-', '*'] :
    ['+', '-', '*', '/'];

  for (let i = 0; i < complexity; i++) {
    const op = pick(ops);
    const num = randInt(numRange[0], numRange[1]);
    tokens.push(op, num);
  }

  // Randomly wrap a portion in parentheses for higher difficulty
  let exprString = tokens.join(' ');
  if (complexity >= 3) {
    // wrap first 3 tokens (a op b) in parens
    const wrapped = `(${tokens.slice(0, 3).join(' ')})`;
    exprString = [wrapped, ...tokens.slice(3)].join(' ');
  }

  // eslint-disable-next-line no-eval
  const answer = Math.round(eval(exprString));

  return {
    topic: 'pemdas',
    prompt: exprString.replace(/\*/g, '\u00D7'),
    answer,
    choices: buildChoices(answer, Math.max(4, Math.round(Math.abs(answer) * 0.25) || 4)),
  };
}

// ---------------------------------------------------------------------
// Topic: Shapes
// ---------------------------------------------------------------------

const SHAPE_LIBRARY = [
  { name: 'Triangle', sides: 3, angles: 3 },
  { name: 'Square', sides: 4, angles: 4 },
  { name: 'Pentagon', sides: 5, angles: 5 },
  { name: 'Hexagon', sides: 6, angles: 6 },
  { name: 'Heptagon', sides: 7, angles: 7 },
  { name: 'Octagon', sides: 8, angles: 8 },
  { name: 'Circle', sides: 0, angles: 0 },
];

function generateShapes(difficulty) {
  // Easy: identify shape by name from an image/icon (UI renders the shape,
  // this module just tells the UI WHICH shape and what the question is).
  // Harder: ask about number of sides/angles, or compare two shapes.
  const shape = pick(SHAPE_LIBRARY.filter((s) => s.sides > 0));

  if (difficulty <= 4) {
    // "How many sides does a Pentagon have?"
    const answer = shape.sides;
    return {
      topic: 'shapes',
      subtype: 'identify-sides',
      shape: shape.name,
      prompt: `How many sides does a ${shape.name} have?`,
      answer,
      choices: buildChoices(answer, 2),
    };
  }

  // Harder: name the shape given the number of sides
  // Exclude any shape with the same side count to prevent ambiguous questions
  const answer = shape.name;
  const distractorPool = SHAPE_LIBRARY.filter((s) => s.name !== shape.name && s.sides > 0 && s.sides !== shape.sides);
  const distractors = shuffle(distractorPool).slice(0, 3).map((s) => s.name);
  return {
    topic: 'shapes',
    subtype: 'name-from-sides',
    prompt: `Which shape has ${shape.sides} sides?`,
    answer,
    choices: shuffle([answer, ...distractors]),
  };
}

// ---------------------------------------------------------------------
// Topic: Clocks / Time-telling
// ---------------------------------------------------------------------

function generateClock(difficulty) {
  let hour = randInt(1, 12);
  let minute;

  if (difficulty <= 3) {
    // easy: only :00 or :30
    minute = pick([0, 30]);
  } else if (difficulty <= 7) {
    // medium: quarter increments
    minute = pick([0, 15, 30, 45]);
  } else {
    // hard: any 5-minute increment
    minute = randInt(0, 11) * 5;
  }

  const displayMinute = minute.toString().padStart(2, '0');
  const answer = `${hour}:${displayMinute}`;

  // Build plausible wrong-time distractors (off by an hour or common minute slip)
  const wrongMinutes = shuffle([0, 15, 30, 45].filter((m) => m !== minute)).slice(0, 2);
  const distractors = [
    `${hour === 12 ? 1 : hour + 1}:${displayMinute}`,
    `${hour}:${wrongMinutes[0].toString().padStart(2, '0')}`,
    `${hour === 1 ? 12 : hour - 1}:${wrongMinutes[1] !== undefined ? wrongMinutes[1].toString().padStart(2, '0') : displayMinute}`,
  ];

  return {
    topic: 'clock',
    // UI should render an analog clock face with hourHand/minuteHand angles.
    hour,
    minute,
    hourAngle: ((hour % 12) + minute / 60) * 30, // degrees
    minuteAngle: minute * 6, // degrees
    prompt: 'What time is shown on the clock?',
    answer,
    choices: shuffle([answer, ...distractors]),
  };
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

const TOPIC_GENERATORS = {
  arithmetic: generateArithmetic,
  pemdas: generatePemdas,
  shapes: generateShapes,
  clock: generateClock,
};

/**
 * Generate a single question.
 * @param {number} difficulty - integer difficulty level, 1+
 * @param {string[]} [topics] - restrict to a subset of topics; defaults to all
 * @returns {object} question object (shape varies slightly by topic — see above)
 */
function generateQuestion(difficulty = 1, topics = Object.keys(TOPIC_GENERATORS)) {
  const topic = pick(topics);
  const generator = TOPIC_GENERATORS[topic];
  const question = generator(difficulty);
  return {
    id: `${Date.now()}-${randInt(1000, 9999)}`,
    difficulty,
    ...question,
  };
}

module.exports = {
  generateQuestion,
  TOPIC_GENERATORS,
};
