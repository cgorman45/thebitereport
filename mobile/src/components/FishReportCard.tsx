import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

const SPECIES_COLORS: Record<string, string> = {
  Yellowtail: '#eab308',
  'Bluefin Tuna': '#3b82f6',
  'Yellowfin Tuna': '#f59e0b',
  'Calico Bass': '#22c55e',
  'White Seabass': '#e2e8f0',
  Barracuda: '#8b5cf6',
  Dorado: '#22d3ee',
  Bonito: '#06b6d4',
  Rockfish: '#ef4444',
  Halibut: '#84cc16',
  Sheephead: '#f97316',
};

const QUANTITY_LABELS: Record<string, string> = {
  few: 'Few',
  some: 'Some',
  lots: 'Lots',
  'wide-open': 'Wide Open!',
};

const QUANTITY_COLORS: Record<string, string> = {
  few: colors.muted,
  some: colors.yellow,
  lots: colors.orange,
  'wide-open': colors.red,
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  species: string;
  quantity: string;
  bait?: string | null;
  display_name?: string | null;
  created_at: string;
  verification_count?: number;
  onPress?: () => void;
}

export default function FishReportCard({
  species,
  quantity,
  bait,
  display_name,
  created_at,
  verification_count = 0,
  onPress,
}: Props) {
  const dotColor = SPECIES_COLORS[species] ?? colors.accent;
  const qLabel = QUANTITY_LABELS[quantity] ?? quantity;
  const qColor = QUANTITY_COLORS[quantity] ?? colors.muted;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Left: color dot + species */}
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View>
          <Text style={styles.species}>{species}</Text>
          {bait ? <Text style={styles.bait}>{bait}</Text> : null}
        </View>
      </View>

      {/* Right: quantity badge + meta */}
      <View style={styles.right}>
        <View style={[styles.quantityBadge, { borderColor: qColor + '60', backgroundColor: qColor + '18' }]}>
          <Text style={[styles.quantityText, { color: qColor }]}>{qLabel}</Text>
        </View>
        <Text style={styles.meta}>{relativeTime(created_at)}</Text>
        {verification_count > 0 && (
          <Text style={styles.verifications}>✓ {verification_count}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  species: { fontSize: 13, color: colors.text, fontWeight: '700' },
  bait: { fontSize: 10, color: colors.muted, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 3 },
  quantityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  quantityText: { fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 10, color: colors.muted },
  verifications: { fontSize: 10, color: colors.green, fontWeight: '600' },
});
