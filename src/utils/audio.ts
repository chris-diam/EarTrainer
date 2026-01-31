import { Note, NoteName } from '../types';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Frequencies for notes in octave 4 (A4 = 440Hz standard)
const BASE_FREQUENCIES: Record<NoteName, number> = {
  'C': 261.63,
  'C#': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'B': 493.88,
};

// Calculate frequency for any octave
export function getFrequency(noteName: NoteName, octave: number): number {
  const baseFreq = BASE_FREQUENCIES[noteName];
  const octaveDiff = octave - 4;
  return baseFreq * Math.pow(2, octaveDiff);
}

// Check if a note is a black key
export function isBlackKey(noteName: NoteName): boolean {
  return noteName.includes('#');
}

// Generate all notes for given octave range
export function generateNotes(startOctave: number, octaveCount: number): Note[] {
  const noteNames: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const notes: Note[] = [];

  for (let octave = startOctave; octave < startOctave + octaveCount; octave++) {
    for (const name of noteNames) {
      notes.push({
        name,
        octave,
        frequency: getFrequency(name, octave),
        isBlack: isBlackKey(name),
      });
    }
  }

  return notes;
}

// Get note ID string (e.g., 'C4', 'F#5')
export function getNoteId(note: Note): string {
  return `${note.name}${note.octave}`;
}

// Compare two notes
export function notesEqual(a: Note, b: Note): boolean {
  return a.name === b.name && a.octave === b.octave;
}

// ============================================
// AUDIO PLAYBACK - Platform specific
// ============================================

// Stop control
let stopRequested = false;
let activeOscillators: OscillatorNode[] = [];
let activeSounds: Audio.Sound[] = [];

export function stopAllAudio(): void {
  stopRequested = true;

  // Stop web oscillators
  activeOscillators.forEach(osc => {
    try {
      osc.stop();
    } catch (e) {
      // Already stopped
    }
  });
  activeOscillators = [];

  // Stop mobile sounds
  activeSounds.forEach(sound => {
    try {
      sound.stopAsync();
      sound.unloadAsync();
    } catch (e) {
      // Already stopped
    }
  });
  activeSounds = [];
}

export function resetStopFlag(): void {
  stopRequested = false;
}

export function isStopRequested(): boolean {
  return stopRequested;
}

// Web Audio API context (for web only)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (Platform.OS !== 'web') return null;

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Generate WAV data for a tone (for mobile)
function generateWavTone(frequency: number, duration: number, sampleRate: number = 44100): string {
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate audio samples with envelope
  const attackTime = 0.02;
  const decayTime = 0.1;
  const sustainLevel = 0.5;
  const releaseStart = duration * 0.7;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    let envelope = 1;
    if (t < attackTime) {
      envelope = t / attackTime;
    } else if (t < attackTime + decayTime) {
      envelope = 1 - (1 - sustainLevel) * ((t - attackTime) / decayTime);
    } else if (t > releaseStart) {
      envelope = sustainLevel * (1 - (t - releaseStart) / (duration - releaseStart));
    } else {
      envelope = sustainLevel;
    }

    const fundamental = Math.sin(2 * Math.PI * frequency * t);
    const harmonic2 = 0.3 * Math.sin(2 * Math.PI * frequency * 2 * t);
    const harmonic3 = 0.1 * Math.sin(2 * Math.PI * frequency * 3 * t);

    const sample = (fundamental + harmonic2 + harmonic3) * envelope * 0.5;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));

    view.setInt16(headerSize + i * bytesPerSample, intSample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

// Play note using Web Audio API (web only)
async function playNoteWeb(note: Note, duration: number, sustain: boolean): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx || stopRequested) return;

  const actualDuration = sustain ? duration * 3 : duration;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(note.frequency, ctx.currentTime);

  const oscillator2 = ctx.createOscillator();
  oscillator2.type = 'sine';
  oscillator2.frequency.setValueAtTime(note.frequency * 2, ctx.currentTime);

  const gainNode2 = ctx.createGain();

  const now = ctx.currentTime;

  if (sustain) {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.4, now + 0.15);
    gainNode.gain.setValueAtTime(0.4, now + actualDuration * 0.7);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + actualDuration);

    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainNode2.gain.setValueAtTime(0.15, now + actualDuration * 0.7);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + actualDuration);
  } else {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + actualDuration);

    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + actualDuration * 0.8);
  }

  oscillator.connect(gainNode);
  oscillator2.connect(gainNode2);
  gainNode.connect(ctx.destination);
  gainNode2.connect(ctx.destination);

  // Track active oscillators
  activeOscillators.push(oscillator, oscillator2);

  oscillator.start(now);
  oscillator2.start(now);
  oscillator.stop(now + actualDuration);
  oscillator2.stop(now + actualDuration);

  return new Promise(resolve => {
    const checkStop = setInterval(() => {
      if (stopRequested) {
        clearInterval(checkStop);
        resolve();
      }
    }, 50);

    setTimeout(() => {
      clearInterval(checkStop);
      // Remove from active
      activeOscillators = activeOscillators.filter(o => o !== oscillator && o !== oscillator2);
      resolve();
    }, actualDuration * 1000);
  });
}

// Play note using expo-av (mobile)
async function playNoteMobile(note: Note, duration: number, sustain: boolean): Promise<void> {
  if (stopRequested) return;

  const actualDuration = sustain ? duration * 2.5 : duration;

  try {
    const wavData = generateWavTone(note.frequency, actualDuration);

    const { sound } = await Audio.Sound.createAsync(
      { uri: wavData },
      { shouldPlay: true, volume: 0.8 }
    );

    activeSounds.push(sound);

    await new Promise<void>(resolve => {
      const checkStop = setInterval(() => {
        if (stopRequested) {
          clearInterval(checkStop);
          sound.stopAsync().catch(() => {});
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkStop);
        sound.unloadAsync().catch(() => {});
        activeSounds = activeSounds.filter(s => s !== sound);
        resolve();
      }, actualDuration * 1000);
    });
  } catch (error) {
    console.error('Error playing note:', error);
  }
}

// Initialize audio for mobile
let audioInitialized = false;

async function initAudio(): Promise<void> {
  if (audioInitialized || Platform.OS === 'web') return;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioInitialized = true;
  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

// Play a single note (platform-aware)
export async function playNote(note: Note, duration: number = 0.8, sustain: boolean = false): Promise<void> {
  await initAudio();

  if (Platform.OS === 'web') {
    return playNoteWeb(note, duration, sustain);
  } else {
    return playNoteMobile(note, duration, sustain);
  }
}

// Play notes sequentially (melody mode)
export async function playNotesSequential(
  notes: Note[],
  delayBetween: number = 0.4,
  sustain: boolean = false
): Promise<void> {
  await initAudio();
  const noteDuration = sustain ? 1.0 : 0.6;

  for (const note of notes) {
    if (stopRequested) break;
    await playNote(note, noteDuration, sustain);
    if (!sustain && !stopRequested) {
      await new Promise(resolve => setTimeout(resolve, delayBetween * 1000));
    }
  }
}

// Play notes simultaneously (chord mode)
export async function playNotesSimultaneous(
  notes: Note[],
  sustain: boolean = false
): Promise<void> {
  await initAudio();
  if (stopRequested) return;

  const duration = sustain ? 2.5 : 1.2;
  const promises = notes.map(note => playNote(note, duration, sustain));
  await Promise.all(promises);
}

// Unified play function
export async function playNotes(
  notes: Note[],
  options: { simultaneous?: boolean; sustain?: boolean } = {}
): Promise<void> {
  const { simultaneous = false, sustain = false } = options;

  resetStopFlag();

  if (simultaneous) {
    await playNotesSimultaneous(notes, sustain);
  } else {
    await playNotesSequential(notes, 0.4, sustain);
  }
}

// Get random notes from available notes
export function getRandomNotes(allNotes: Note[], count: number): Note[] {
  const shuffled = [...allNotes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
