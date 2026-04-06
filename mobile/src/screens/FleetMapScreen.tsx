import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { apiFetch } from '../lib/api';

interface BoatPosition {
  mmsi: number;
  name: string;
  landing: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  heading: number;
  timestamp: number;
}

interface FleetResponse {
  connected: boolean;
  count: number;
  positions: BoatPosition[];
}

const STATUS_COLORS: Record<string, string> = {
  catching_fish: colors.green,
  circling: colors.orange,
  transit: colors.blue,
  drifting: '#06b6d4',
  in_port: '#6b7280',
};

function getStatus(sog: number): { label: string; color: string } {
  if (sog > 5) return { label: 'Transit', color: STATUS_COLORS.transit };
  if (sog > 2) return { label: 'Moving', color: STATUS_COLORS.circling };
  if (sog > 0.3) return { label: 'Drifting', color: STATUS_COLORS.drifting };
  return { label: 'In Port', color: STATUS_COLORS.in_port };
}

const LANDING_FILTERS = ['All', 'Seaforth', "Fisherman's", 'H&M', 'Point Loma', "Helgren's"];
const LANDING_MAP: Record<string, string> = {
  seaforth: 'Seaforth',
  fishermans: "Fisherman's",
  hm_landing: 'H&M',
  point_loma: 'Point Loma',
  helgrens: "Helgren's",
};

export default function FleetMapScreen() {
  const [positions, setPositions] = useState<BoatPosition[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<BoatPosition | null>(null);
  const [filter, setFilter] = useState('All');

  const fetchPositions = useCallback(async () => {
    try {
      const data = await apiFetch<FleetResponse>('/api/fleet/positions');
      if (data.positions) setPositions(data.positions);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const filtered = filter === 'All'
    ? positions
    : positions.filter((p) => LANDING_MAP[p.landing]?.includes(filter));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Tracker</Text>
        <View style={styles.liveBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.liveText}>Live · {positions.length} boats</Text>
        </View>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={LANDING_FILTERS}
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

      {/* Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: 32.75,
          longitude: -117.23,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
        mapType="standard"
        userInterfaceStyle="dark"
      >
        {filtered.map((boat) => {
          const { label, color } = getStatus(boat.sog);
          return (
            <Marker
              key={boat.mmsi}
              coordinate={{ latitude: boat.lat, longitude: boat.lng }}
              title={boat.name}
              description={`${label} · ${boat.sog.toFixed(1)} kts`}
              pinColor={color}
              onPress={() => setSelectedBoat(boat)}
            />
          );
        })}
      </MapView>

      {/* Selected boat info card */}
      {selectedBoat && (
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSelectedBoat(null)}
          >
            <Text style={{ color: colors.muted, fontSize: 16 }}>×</Text>
          </TouchableOpacity>
          <Text style={styles.infoName}>{selectedBoat.name}</Text>
          <Text style={styles.infoLanding}>
            {LANDING_MAP[selectedBoat.landing] ?? selectedBoat.landing}
          </Text>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Speed</Text>
              <Text style={styles.infoValue}>{selectedBoat.sog.toFixed(1)} kts</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Heading</Text>
              <Text style={styles.infoValue}>{selectedBoat.heading}°</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: getStatus(selectedBoat.sog).color }]}>
                {getStatus(selectedBoat.sog).label}
              </Text>
            </View>
          </View>
        </View>
      )}
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
    paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 11, color: colors.green, fontWeight: '600' },
  filterRow: { maxHeight: 40, marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  filterChipText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  filterChipTextActive: { color: colors.accent },
  map: { flex: 1 },
  infoCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  closeBtn: { position: 'absolute', top: 8, right: 12 },
  infoName: { fontSize: 16, fontWeight: '700', color: colors.text },
  infoLanding: { fontSize: 12, color: colors.accent, marginTop: 2 },
  infoRow: { flexDirection: 'row', marginTop: 12, gap: 16 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
});
