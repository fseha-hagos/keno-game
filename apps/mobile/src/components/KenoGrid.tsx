import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/useGameStore';

export const KenoGrid: React.FC = () => {
  const { selectedNumbers, toggleNumber, drawnNumbers } = useGameStore();
  const drawnSet = new Set(drawnNumbers);

  const numbers = Array.from({ length: 80 }, (_, i) => i + 1);

  return (
    <View style={styles.gridContainer}>
      {numbers.map((num) => {
        const isSelected = selectedNumbers.includes(num);
        const isDrawn = drawnSet.has(num);
        const isHit = isSelected && isDrawn;

        let ballStyle = styles.ballDefault;
        let textStyle = styles.textDefault;

        if (isHit) {
          ballStyle = styles.ballHit;
          textStyle = styles.textHit;
        } else if (isSelected) {
          ballStyle = styles.ballSelected;
          textStyle = styles.textSelected;
        } else if (isDrawn) {
          ballStyle = styles.ballDrawn;
          textStyle = styles.textDrawn;
        }

        return (
          <TouchableOpacity
            key={num}
            activeOpacity={0.7}
            style={[styles.ball, ballStyle]}
            onPress={() => toggleNumber(num)}
          >
            <Text style={[styles.ballText, textStyle]}>
              {num < 10 ? `0${num}` : num}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ball: {
    width: '9.2%',
    aspectRatio: 1,
    marginVertical: 3,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ballDefault: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  ballSelected: {
    backgroundColor: '#D97706',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 4,
  },
  ballDrawn: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  ballHit: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  ballText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textDefault: {
    color: '#94A3B8',
  },
  textSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  textDrawn: {
    color: '#FFFFFF',
  },
  textHit: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
