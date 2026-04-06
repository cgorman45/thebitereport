import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { apiFetch } from '../lib/api';

interface CatchEntry {
  boat: string;
  landing: string;
  duration: string;
  date: string;
  anglers: number;
  species: string;
  count: number;
  highlight?: boolean;
  bycatch?: { species: string; count: number }[];
}

const LANDING_FILTERS = ['All', 'Seaforth', "Fisherman's", 'H&M', 'Point Loma', "Helgren's"];

const SPECIES_COLORS: Record<string, string> = {
  yellowtail: '#eab308',
  'bluefin tuna': '#3b82f6',
  'yellowfin tuna': '#f59e0b',
  'calico bass': '#22c55e',
  rockfish: '#ef4444',
  'white seabass': '#e2e8f0',
  barracuda: '#8b5cf6',
  sheephead: '#f97316',
  bonito: '#06b6d4',
  sculpin: '#a855f7',
  dorado: '#22d3ee',
  halibut: '#84cc16',
  whitefish: '#94a3b8',
};

function getSpeciesColor(species: string): string {
  return SPECIES_COLORS[species.toLowerCase()] ?? colors.text;
}

function FireIcon() {
  return (
    <Text style={{ fontSize: 14, marginRight: 4 }}>🔥</Text>
  );
}

function CatchCard({ entry }: { entry: CatchEntry }) {
  const perRod = entry.anglers > 0 ? (entry.count / entry.anglers).toFixed(1) : '0';
  const speciesColor = getSpeciesColor(entry.species);

  return (
    <View
      style={[
        styles.card,
        entry.highlight && { borderLeftColor: colors.orange, borderLeftWidth: 3 },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {entry.highlight && <FireIcon />}
            <Text style={styles.boatName}>{entry.boat}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <View style={styles.landingBadge}>
              <Text style={styles.landingText}>{entry.landing}</Text>
            </View>
          </View>
          <Text style={styles.tripInfo}>
            {entry.duration} · {entry.anglers} anglers · {perRod} per rod
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.speciesBadge, { color: speciesColor }]}>
            {entry.species}
          </Text>
          <Text style={[styles.catchCount, { color: speciesColor }]}>
            {entry.count}
          </Text>
        </View>
      </View>

      {entry.bycatch && entry.bycatch.length > 0 && (
        <View style={styles.bycatchRow}>
          {entry.bycatch.map((b, i) => (
            <Text key={i} style={styles.bycatchText}>
              {b.species} <Text style={{ color: colors.text, fontWeight: '700' }}>{b.count}</Text>
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const [reports, setReports] = useState<CatchEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchReports = useCallback(async () => {
    try {
      const data = await apiFetch<CatchEntry[]>('/api/catch-reports');
      // Auto-highlight exceptional catches
      const PREMIUM = ['bluefin tuna', 'yellowfin tuna', 'yellowtail', 'white seabass', 'dorado'];
      const highlighted = data.map((entry) => {
        const perRod = entry.anglers > 0 ? entry.count / entry.anglers : 0;
        const isPremium = PREMIUM.includes(entry.species.toLowerCase());
        return { ...entry, highlight: isPremium || perRod >= 3 };
      });
      setReports(highlighted);
    } catch {
      // Silent fail — show empty state
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, [fetchReports]);

  const filtered = filter === 'All'
    ? reports
    : reports.filter((r) => r.landing.toLowerCase().includes(filter.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          THE <Text style={{ color: colors.accent }}>BITE</Text> REPORT
        </Text>
        {reports.length > 0 && (
          <View style={styles.liveBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        )}
      </View>

      {/* Landing filters */}
      <FlatList
        horizontal
        data={LANDING_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setFilter(item)}
            style={[
              styles.filterChip,
              filter === item && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === item && styles.filterChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Section header */}
      <Text style={styles.sectionTitle}>Recent Catch Reports</Text>

      {/* Catch list */}
      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <CatchCard entry={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {reports.length === 0 ? 'Loading catch reports...' : 'No reports for this landing'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 12, color: colors.green, fontWeight: '600' },
  filterRow: { maxHeight: 44, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  filterChipText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  filterChipTextActive: { color: colors.accent },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  boatName: { fontSize: 15, fontWeight: '700', color: colors.text },
  landingBadge: {
    backgroundColor: colors.accent + '15',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  landingText: { fontSize: 10, color: colors.accent, fontWeight: '600' },
  tripInfo: { fontSize: 11, color: colors.muted, marginTop: 4 },
  speciesBadge: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  catchCount: { fontSize: 28, fontWeight: '900', marginTop: 2 },
  bycatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bycatchText: { fontSize: 11, color: colors.muted },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.muted },
});
