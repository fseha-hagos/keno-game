import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore } from '../store/useGameStore';
import { DEFAULT_96_PAYTABLE_ENTRIES, getMultiplier } from '@keno/game-math';

const MAX_SLIPS = 5;

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SlipStakeInput = ({ slipId, stakeMinor }: { slipId: string; stakeMinor: string }) => {
  const { setStakeForSlip } = useGameStore();
  const stake = Number(stakeMinor) / 100;
  const [text, setText] = useState(stake.toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(stake.toFixed(2));
    }
  }, [stake, focused]);

  const handleChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setText(sanitized);

    const parsed = parseFloat(sanitized);
    if (!isNaN(parsed) && parsed > 0) {
      setStakeForSlip(slipId, String(Math.round(parsed * 100)));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(text);
    if (isNaN(parsed) || parsed <= 0) {
      setStakeForSlip(slipId, '100');
      setText('1.00');
    } else {
      const clamped = Math.min(Math.max(parsed, 1), 50000);
      setStakeForSlip(slipId, String(Math.round(clamped * 100)));
      setText(clamped.toFixed(2));
    }
  };

  return (
    <TextInput
      style={styles.slipStakeInput}
      value={focused ? text : stake.toFixed(2)}
      onChangeText={handleChange}
      onFocus={() => {
        setFocused(true);
        setText(stake > 0 ? String(stake) : '');
      }}
      onBlur={handleBlur}
      keyboardType="numeric"
      selectTextOnFocus
      placeholder="5.00"
      placeholderTextColor="#64748B"
    />
  );
};

export const BetSlipsPanel = () => {
  const {
    betSlips,
    activeSlipId,
    addSlip,
    setActiveSlip,
    incrementStakeForSlip,
    decrementStakeForSlip,
  } = useGameStore();

  const filledSlips = betSlips.filter((s) => s.selectedNumbers.length > 0);
  const showSlips = betSlips.filter(
    (s) => s.selectedNumbers.length > 0 || s.id === activeSlipId,
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>YOUR SLIPS</Text>

      {filledSlips.length < MAX_SLIPS && (
        <TouchableOpacity onPress={addSlip} style={styles.addSlipBtn} activeOpacity={0.8}>
          <Text style={styles.addSlipText}>+ Add Slip</Text>
        </TouchableOpacity>
      )}

      <View style={styles.list}>
        {showSlips.map((slip, idx) => {
          const isActive = slip.id === activeSlipId;
          const spots = slip.selectedNumbers.length;
          const stake = Number(slip.stakeMinor) / 100;
          const maxMult =
            spots > 0 ? getMultiplier(DEFAULT_96_PAYTABLE_ENTRIES, spots, spots) : 0;
          const maxWin = stake * maxMult;

          // Build 5 slots
          const slots: (number | null)[] = [...slip.selectedNumbers];
          while (slots.length < 5) slots.push(null);

          return (
            <View key={slip.id} style={[styles.row, isActive && styles.rowActive]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setActiveSlip(slip.id)}
                style={styles.rowMain}
              >
                <View style={styles.rowTop}>
                  <Text style={[styles.slipLabel, isActive && styles.slipLabelActive]}>
                    {isActive ? `Slip ${idx + 1} · editing` : `Slip ${idx + 1}`}
                  </Text>
                  {spots > 0 && (
                    <Text style={styles.spotsTag}>{spots} spot{spots !== 1 ? 's' : ''}</Text>
                  )}
                </View>

                {/* 10 number slots grid */}
                <View style={styles.slotsRow}>
                  {slots.map((num, i) => (
                    <View
                      key={i}
                      style={[
                        styles.slotBox,
                        num !== null ? styles.slotBoxFilled : styles.slotBoxEmpty,
                      ]}
                    >
                      {num !== null && <Text style={styles.slotText}>{num}</Text>}
                    </View>
                  ))}
                </View>

                {spots > 0 && (
                  <Text style={styles.winLine}>Max win {fmt(maxWin)} ETB</Text>
                )}
              </TouchableOpacity>

              <View style={styles.stakeCol}>
                <Text style={styles.stakeColLabel}>Stake</Text>
                <View style={styles.stakeStepper}>
                  <TouchableOpacity
                    onPress={() => decrementStakeForSlip(slip.id)}
                    style={styles.stepBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <SlipStakeInput slipId={slip.id} stakeMinor={slip.stakeMinor} />
                  <TouchableOpacity
                    onPress={() => incrementStakeForSlip(slip.id)}
                    style={[styles.stepBtn, styles.stepBtnPlus]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 6,
    marginTop: 8,
    gap: 6,
  },
  sectionTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A38',
  },
  rowActive: {
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    paddingLeft: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  rowMain: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slipLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  slipLabelActive: {
    color: '#22C55E',
  },
  spotsTag: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  slotBox: {
    flex: 1,
    height: 24,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotBoxFilled: {
    backgroundColor: '#243044',
    borderWidth: 1,
    borderColor: '#2E4058',
  },
  slotBoxEmpty: {
    backgroundColor: '#0F1923',
    borderWidth: 1,
    borderColor: '#1E2A38',
  },
  slotText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '800',
  },
  winLine: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: '700',
  },
  stakeCol: {
    alignItems: 'center',
    gap: 4,
  },
  stakeColLabel: {
    color: '#475569',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stakeStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1E2A38',
    borderWidth: 1,
    borderColor: '#2A3A4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnPlus: {
    borderColor: '#22C55E',
  },
  stepBtnText: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  stakeAmount: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 52,
    textAlign: 'center',
  },
  slipStakeInput: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 52,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 4,
    backgroundColor: '#0F1923',
  },
  addSlipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  addSlipText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '800',
  },
});
