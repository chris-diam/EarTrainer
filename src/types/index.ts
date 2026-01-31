// Note names
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

// Full note with octave (e.g., 'C4', 'F#5')
export interface Note {
  name: NoteName;
  octave: number;
  frequency: number;
  isBlack: boolean;
}

// Game state
export type GameState = 'idle' | 'playing' | 'guessing' | 'result';

// Game settings
export interface GameSettings {
  numberOfNotes: number; // 1-7
  startOctave: number;   // Starting octave (e.g., 3)
  octaveRange: number;   // Number of octaves (e.g., 3)
}

// Game result
export interface GameResult {
  targetNotes: Note[];
  guessedNotes: Note[];
  correct: boolean;
}
