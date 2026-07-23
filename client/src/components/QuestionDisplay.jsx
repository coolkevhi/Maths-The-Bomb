import React, { useState, useEffect, useRef } from 'react';
import AnalogClock from './AnalogClock.jsx';
import '../styles/QuestionDisplay.css';

/**
 * QuestionDisplay — shows the current question and answer input.
 *
 * Multiple-choice mode (clock, shape names): rendered as buttons.
 * Free-text mode (arithmetic, PEMDAS, shape sides): rendered as a number
 *   input so players type their answer. The active player's live keystrokes
 *   are forwarded via `onTyping` so spectators/watchers see them in real time.
 *
 * Props:
 *   question        — question object from engine
 *   isActivePlayer  — true when this client should interact with the input
 *   onAnswer        — callback(answerValue) on submission/selection
 *   onTyping        — callback(text) fired on every keystroke (text-input mode)
 *   selectedChoice  — currently highlighted value (from live typing/hovering)
 *   difficulty      — current difficulty level (for badge)
 */
export default function QuestionDisplay({
  question,
  isActivePlayer,
  onAnswer,
  onTyping,
  selectedChoice,
  difficulty,
}) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef(null);

  // Numeric answers → free-text input; string answers → multiple choice.
  const isTextInput = question && typeof question.answer === 'number';

  // Reset typed value and re-focus whenever the question changes.
  useEffect(() => {
    setTyped('');
    if (isActivePlayer && isTextInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [question?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!question) return null;

  function handleTextChange(e) {
    const val = e.target.value;
    setTyped(val);
    onTyping?.(val); // broadcast live keystrokes to other players
  }

  function handleSubmit(e) {
    e.preventDefault();
    const num = Number(typed);
    if (typed.trim() !== '' && !isNaN(num)) {
      onAnswer?.(Math.round(num));
    }
  }

  return (
    <div className="question-display">
      {/* Difficulty / topic badge */}
      <div className="question-meta">
        <span className="badge-topic">{question.topic?.toUpperCase()}</span>
        <span className="badge-diff">Lv.{difficulty}</span>
      </div>

      {/* Prompt */}
      <div className="question-prompt">
        {question.topic === 'clock' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <AnalogClock hourAngle={question.hourAngle} minuteAngle={question.minuteAngle} size={90} />
            <p className="question-text">{question.prompt}</p>
          </div>
        ) : (
          <p className="question-text">{question.prompt}</p>
        )}
      </div>

      {/* ── Answer area ─────────────────────────────────────────────────── */}
      {isTextInput ? (
        isActivePlayer ? (
          /* Active player: free-text number input */
          <form className="text-answer-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="text-answer-input"
              type="number"
              value={typed}
              onChange={handleTextChange}
              placeholder="Type answer…"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-lg text-answer-submit"
              disabled={typed.trim() === '' || isNaN(Number(typed))}
            >
              ✓ Submit
            </button>
          </form>
        ) : (
          /* Spectator / waiting player: show what the active player is typing */
          <div className="peer-typing-display">
            {selectedChoice !== null && selectedChoice !== undefined && selectedChoice !== ''
              ? (
                <>
                  <span className="peer-typing-label">Typing:</span>
                  <span className="peer-typing-value">{selectedChoice}</span>
                </>
              ) : (
                <span className="peer-typing-waiting">waiting for answer…</span>
              )}
          </div>
        )
      ) : (
        /* Multiple-choice buttons (clock, shape names) */
        question.choices && (
          <div className="question-choices">
            {question.choices.map((choice, i) => (
              <button
                key={`${choice}-${i}`}
                className={`choice-btn ${selectedChoice === choice ? 'choice-btn--selected' : ''}`}
                onClick={() => isActivePlayer && onAnswer?.(choice)}
                onMouseEnter={() => isActivePlayer && onTyping?.(choice)}
                disabled={!isActivePlayer}
                style={{ cursor: isActivePlayer ? 'pointer' : 'default' }}
              >
                {choice}
              </button>
            ))}
          </div>
        )
      )}

      {!isActivePlayer && !isTextInput && (
        <p className="spectator-hint">Watching the active player…</p>
      )}
    </div>
  );
}
