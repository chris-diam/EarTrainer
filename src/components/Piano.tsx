import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Note } from '../types';
import { getNoteId } from '../utils/audio';

interface PianoProps {
  notes: Note[];
  onNotePress: (note: Note) => void;
  highlightedNotes?: Note[];
  disabled?: boolean;
  selectedNotes?: Note[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIANO_PADDING = 16; // Padding on each side
const PIANO_WIDTH = SCREEN_WIDTH - (PIANO_PADDING * 2);

export const Piano: React.FC<PianoProps> = ({
  notes,
  onNotePress,
  highlightedNotes = [],
  disabled = false,
  selectedNotes = [],
}) => {
  const whiteNotes = notes.filter(n => !n.isBlack);
  const blackNotes = notes.filter(n => n.isBlack);

  const whiteKeyWidth = PIANO_WIDTH / whiteNotes.length;
  const blackKeyWidth = whiteKeyWidth * 0.65;

  const isHighlighted = (note: Note) =>
    highlightedNotes.some(n => getNoteId(n) === getNoteId(note));

  const isSelected = (note: Note) =>
    selectedNotes.some(n => getNoteId(n) === getNoteId(note));

  // Calculate black key positions
  const getBlackKeyPosition = (blackNote: Note): number | null => {
    let whiteKeysBefore = 0;

    for (let i = 0; i < notes.indexOf(blackNote); i++) {
      if (!notes[i].isBlack) {
        whiteKeysBefore++;
      }
    }

    return whiteKeysBefore * whiteKeyWidth - blackKeyWidth / 2;
  };

  return (
    <View style={styles.container}>
      <View style={styles.pianoWrapper}>
        {/* White keys */}
        <View style={styles.whiteKeysContainer}>
          {whiteNotes.map((note) => (
            <TouchableOpacity
              key={getNoteId(note)}
              style={[
                styles.whiteKey,
                { width: whiteKeyWidth - 2 },
                isHighlighted(note) && styles.highlightedWhite,
                isSelected(note) && styles.selectedWhite,
              ]}
              onPress={() => onNotePress(note)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.whiteKeyLabel,
                (isHighlighted(note) || isSelected(note)) && styles.whiteKeyLabelActive
              ]}>
                {note.name}
                <Text style={styles.octaveLabel}>{note.octave}</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Black keys */}
        <View style={styles.blackKeysContainer}>
          {blackNotes.map(note => {
            const position = getBlackKeyPosition(note);
            if (position === null) return null;

            return (
              <TouchableOpacity
                key={getNoteId(note)}
                style={[
                  styles.blackKey,
                  {
                    left: position,
                    width: blackKeyWidth,
                  },
                  isHighlighted(note) && styles.highlightedBlack,
                  isSelected(note) && styles.selectedBlack,
                ]}
                onPress={() => onNotePress(note)}
                activeOpacity={0.7}
              >
                <Text style={styles.blackKeyLabel}>{note.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1117',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#30363d',
  },
  pianoWrapper: {
    position: 'relative',
    height: 160,
    backgroundColor: '#161b22',
    borderRadius: 12,
    overflow: 'hidden',
  },
  whiteKeysContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  blackKeysContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
  },
  whiteKey: {
    height: '100%',
    backgroundColor: '#f0f3f6',
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderBottomWidth: 3,
    borderBottomColor: '#afb8c1',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
    marginHorizontal: 1,
    borderRadius: 0,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  blackKey: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#1c2128',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#30363d',
    borderTopWidth: 0,
  },
  whiteKeyLabel: {
    fontSize: 9,
    color: '#57606a',
    fontWeight: '700',
  },
  whiteKeyLabelActive: {
    color: '#fff',
  },
  octaveLabel: {
    fontSize: 7,
  },
  blackKeyLabel: {
    fontSize: 7,
    color: '#8b949e',
    fontWeight: '600',
  },
  highlightedWhite: {
    backgroundColor: '#3fb950',
    borderBottomColor: '#2ea043',
  },
  highlightedBlack: {
    backgroundColor: '#238636',
    borderColor: '#2ea043',
  },
  selectedWhite: {
    backgroundColor: '#58a6ff',
    borderBottomColor: '#1f6feb',
  },
  selectedBlack: {
    backgroundColor: '#1f6feb',
    borderColor: '#58a6ff',
  },
});
