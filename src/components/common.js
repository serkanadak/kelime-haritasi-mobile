import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, STATUS_META, LEVEL_COLORS } from '../theme';

export function Badge({ label, color }) {
  return (
    <View style={[styles.badge, { borderColor: color || colors.border }]}>
      <Text style={[styles.badgeText, { color: color || colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function LevelBadge({ level }) {
  return <Badge label={level} color={LEVEL_COLORS[level] || colors.textMuted} />;
}

// Kelimeyi kategorize etme butonları (Özellik 3).
export function StatusPicker({ value, onChange }) {
  return (
    <View style={styles.statusRow}>
      {Object.entries(STATUS_META).map(([key, meta]) => {
        const selected = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.statusBtn,
              { borderColor: meta.color },
              selected && { backgroundColor: meta.color },
            ]}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.statusText, selected ? styles.statusTextSel : { color: meta.color }]}>
              {meta.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statusBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  statusTextSel: { color: '#0f172a' },
});
