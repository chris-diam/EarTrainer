import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
} from 'react-native';
import { Piano } from '../components/Piano';
import { Note, GameState } from '../types';
import {
  generateNotes,
  playNotes,
  playNote,
  getRandomNotes,
  getNoteId,
  notesEqual,
  stopAllAudio,
  resetStopFlag,
} from '../utils/audio';

const START_OCTAVE = 3;
const OCTAVE_COUNT = 2;

export const GameScreen: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [numberOfNotes, setNumberOfNotes] = useState(3);
  const [targetNotes, setTargetNotes] = useState<Note[]>([]);
  const [guessedNotes, setGuessedNotes] = useState<Note[]>([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio options - can be changed anytime
  const [simultaneous, setSimultaneous] = useState(false);
  const [sustain, setSustain] = useState(false);

  // Ref to track current settings during playback
  const currentSettings = useRef({ simultaneous: false, sustain: false });

  // Generate all available notes
  const allNotes = useMemo(
    () => generateNotes(START_OCTAVE, OCTAVE_COUNT),
    []
  );

  // Stop playback
  const handleStop = useCallback(() => {
    stopAllAudio();
    setIsPlaying(false);
  }, []);

  // Play notes with current settings
  const doPlayNotes = useCallback(async (notes: Note[]) => {
    currentSettings.current = { simultaneous, sustain };
    setIsPlaying(true);
    resetStopFlag();
    await playNotes(notes, { simultaneous, sustain });
    setIsPlaying(false);
  }, [simultaneous, sustain]);

  // Start a new round
  const startNewRound = useCallback(async () => {
    const notes = getRandomNotes(allNotes, numberOfNotes);
    setTargetNotes(notes);
    setGuessedNotes([]);
    setGameState('playing');
    await doPlayNotes(notes);
    setGameState('guessing');
  }, [allNotes, numberOfNotes, doPlayNotes]);

  // Replay the notes
  const replayNotes = useCallback(async () => {
    if (targetNotes.length === 0) return;
    if (isPlaying) {
      handleStop();
      return;
    }
    await doPlayNotes(targetNotes);
  }, [targetNotes, isPlaying, doPlayNotes, handleStop]);

  // Handle note press
  const handleNotePress = useCallback(
    async (note: Note) => {
      // Play the pressed note with current sustain setting
      playNote(note, 0.5, sustain);

      // Only modify guesses during guessing state
      if (gameState !== 'guessing') return;

      const alreadyGuessed = guessedNotes.some(n => notesEqual(n, note));
      if (alreadyGuessed) {
        setGuessedNotes(prev => prev.filter(n => !notesEqual(n, note)));
      } else if (guessedNotes.length < numberOfNotes) {
        setGuessedNotes(prev => [...prev, note]);
      }
    },
    [gameState, guessedNotes, numberOfNotes, sustain]
  );

  // Submit guess
  const submitGuess = useCallback(() => {
    if (guessedNotes.length !== numberOfNotes) return;

    const targetIds = new Set(targetNotes.map(getNoteId));
    const guessedIds = new Set(guessedNotes.map(getNoteId));

    const isCorrect =
      targetIds.size === guessedIds.size &&
      [...targetIds].every(id => guessedIds.has(id));

    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setGameState('result');
  }, [guessedNotes, targetNotes, numberOfNotes]);

  // Reset for next round
  const nextRound = useCallback(() => {
    setTargetNotes([]);
    setGuessedNotes([]);
    setGameState('idle');
  }, []);

  // Check result
  const isCorrect = useMemo(() => {
    if (gameState !== 'result') return false;
    const targetIds = new Set(targetNotes.map(getNoteId));
    const guessedIds = new Set(guessedNotes.map(getNoteId));
    return (
      targetIds.size === guessedIds.size &&
      [...targetIds].every(id => guessedIds.has(id))
    );
  }, [gameState, targetNotes, guessedNotes]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ear Trainer</Text>
          <Text style={styles.score}>
            Score: {score.correct}/{score.total}
          </Text>
        </View>

        {/* Note count selector - always enabled */}
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsLabel}>Number of notes:</Text>
          <View style={styles.noteCountButtons}>
            {[1, 2, 3, 4, 5, 6, 7].map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.noteCountButton,
                  numberOfNotes === num && styles.noteCountButtonActive,
                ]}
                onPress={() => setNumberOfNotes(num)}
              >
                <Text
                  style={[
                    styles.noteCountText,
                    numberOfNotes === num && styles.noteCountTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Play mode toggles - always enabled */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Chord Mode</Text>
              <Text style={styles.toggleDescription}>
                {simultaneous ? 'Notes play together' : 'Notes play one by one'}
              </Text>
            </View>
            <Switch
              value={simultaneous}
              onValueChange={setSimultaneous}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor={simultaneous ? '#60a5fa' : '#9ca3af'}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Sustain</Text>
              <Text style={styles.toggleDescription}>
                {sustain ? 'Notes ring longer' : 'Notes decay quickly'}
              </Text>
            </View>
            <Switch
              value={sustain}
              onValueChange={setSustain}
              trackColor={{ false: '#374151', true: '#3b82f6' }}
              thumbColor={sustain ? '#60a5fa' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Status message */}
        <View style={styles.statusContainer}>
          {gameState === 'idle' && (
            <Text style={styles.statusText}>
              Press "Play" to start a new round
            </Text>
          )}
          {gameState === 'playing' && (
            <Text style={styles.statusText}>
              Listen carefully... {isPlaying ? '(Playing)' : ''}
            </Text>
          )}
          {gameState === 'guessing' && (
            <Text style={styles.statusText}>
              Select {numberOfNotes} note{numberOfNotes > 1 ? 's' : ''} ({guessedNotes.length}/{numberOfNotes})
            </Text>
          )}
          {gameState === 'result' && (
            <Text style={[styles.statusText, isCorrect ? styles.correctText : styles.wrongText]}>
              {isCorrect ? 'Correct!' : 'Wrong!'} Notes: {targetNotes.map(n => getNoteId(n)).join(', ')}
            </Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          {/* Play/Stop button - always visible when there are notes */}
          {gameState === 'idle' ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startNewRound}
            >
              <Text style={styles.primaryButtonText}>Play</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={isPlaying ? styles.stopButton : styles.playButton}
              onPress={replayNotes}
            >
              <Text style={styles.primaryButtonText}>
                {isPlaying ? 'Stop' : 'Play'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Submit button */}
          {gameState === 'guessing' && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                guessedNotes.length !== numberOfNotes && styles.disabledButton,
              ]}
              onPress={submitGuess}
              disabled={guessedNotes.length !== numberOfNotes}
            >
              <Text style={styles.primaryButtonText}>Submit</Text>
            </TouchableOpacity>
          )}

          {/* Next round button */}
          {gameState === 'result' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={nextRound}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Piano - always enabled for practice */}
        <View style={styles.pianoContainer}>
          <Piano
            notes={allNotes}
            onNotePress={handleNotePress}
            highlightedNotes={gameState === 'result' ? targetNotes : []}
            selectedNotes={guessedNotes}
            disabled={false}
          />
        </View>

        {/* Selected notes display */}
        {guessedNotes.length > 0 && gameState === 'guessing' && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedLabel}>Your selection:</Text>
            <Text style={styles.selectedNotes}>
              {guessedNotes.map(n => getNoteId(n)).join(', ')}
            </Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setGuessedNotes([])}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a12',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: -0.5,
  },
  score: {
    fontSize: 18,
    color: '#a5b4fc',
    fontWeight: '700',
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  settingsContainer: {
    marginBottom: 20,
    backgroundColor: '#12121e',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1b4b',
  },
  settingsLabel: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noteCountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteCountButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2d2d44',
  },
  noteCountButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#6366f1',
  },
  noteCountText: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '700',
  },
  noteCountTextActive: {
    color: '#fff',
  },
  toggleContainer: {
    backgroundColor: '#12121e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e1b4b',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 4,
  },
  statusContainer: {
    backgroundColor: '#12121e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e1b4b',
  },
  statusText: {
    fontSize: 17,
    color: '#d1d5db',
    textAlign: 'center',
    fontWeight: '500',
  },
  correctText: {
    color: '#4ade80',
    fontWeight: '700',
  },
  wrongText: {
    color: '#f87171',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pianoContainer: {
    marginBottom: 24,
  },
  selectedContainer: {
    backgroundColor: '#12121e',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e1b4b',
  },
  selectedLabel: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectedNotes: {
    fontSize: 22,
    color: '#818cf8',
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 1,
  },
  clearButton: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearButtonText: {
    color: '#a5b4fc',
    fontSize: 14,
    fontWeight: '600',
  },
});
