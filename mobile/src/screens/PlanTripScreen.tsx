import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { apiFetch } from '../lib/api';

interface Trip {
  id: string;
  boatName: string;
  landing: string;
  departureDate: string;
  departureTime: string;
  duration: string;
  pricePerPerson: number;
  maxAnglers: number;
  spotsLeft: number;
  targetSpecies: string[];
}

const DURATION_FILTERS = ['All', '1/2 Day', '3/4 Day', 'Full Day', 'Overnight', 'Multi-Day'];

function SpotsLeftBadge({ spots }: { spots: number }) {
  const color = spots <= 5 ? colors.red : spots <= 15 ? colors.orange : colors.green;
  return (
    <View style={[styles.spotsBadge, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <Text style={[styles.spotsText, { color }]}>{spots} spots</Text>
    </View>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.boatName}>{trip.boatName}</Text>
          <Text style={styles.landing}>{trip.landing}</Text>
        </View>
        <SpotsLeftBadge spots={trip.spotsLeft} />
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detail}>{trip.departureDate}</Text>
        <Text style={styles.detailDot}>·</Text>
        <Text style={styles.detail}>{trip.departureTime}</Text>
        <Text style={styles.detailDot}>·</Text>
        <Text style={styles.detail}>{trip.duration}</Text>
      </View>

      <View style={styles.speciesRow}>
        {trip.targetSpecies.slice(0, 3).map((sp, i) => (
          <View key={i} style={styles.speciesChip}>
            <Text style={styles.speciesChipText}>{sp}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.price}>${trip.pricePerPerson}<Text style={styles.priceLabel}>/person</Text></Text>
      </View>
    </View>
  );
}

export default function PlanTripScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchTrips = useCallback(async () => {
    try {
      const data = await apiFetch<Trip[]>('/api/trips');
      if (Array.isArray(data)) setTrips(data);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [fetchTrips]);

  const filtered = filter === 'All'
    ? trips
    : trips.filter((t) => t.duration.toLowerCase().includes(filter.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan Your Trip</Text>
        {trips.length > 0 && (
          <View style={styles.liveBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.liveText}>{trips.length} trips</Text>
          </View>
        )}
      </View>

      {/* Duration filters */}
      <FlatList
        horizontal
        data={DURATION_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {trips.length === 0 ? 'Loading trips...' : 'No trips match this filter'}
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
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 11, color: colors.green, fontWeight: '600' },
  filterRow: { maxHeight: 40, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  filterChipText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  filterChipTextActive: { color: colors.accent },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  boatName: { fontSize: 15, fontWeight: '700', color: colors.text },
  landing: { fontSize: 11, color: colors.accent, marginTop: 2 },
  spotsBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  spotsText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  detail: { fontSize: 12, color: colors.muted },
  detailDot: { fontSize: 12, color: colors.border },
  speciesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  speciesChip: {
    backgroundColor: colors.accent + '10',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  speciesChipText: { fontSize: 10, color: colors.accent, fontWeight: '600', textTransform: 'capitalize' },
  cardBottom: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 18, fontWeight: '900', color: colors.text },
  priceLabel: { fontSize: 12, fontWeight: '400', color: colors.muted },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.muted },
});
