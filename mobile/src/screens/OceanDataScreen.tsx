import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';

type WindyOverlay = 'wind' | 'waves' | 'currents' | 'swell';

interface LayerToggle {
  id: string;
  label: string;
  color: string;
  badge: string;
  badgeColor: string;
  enabled: boolean;
}

const WINDY_OVERLAYS: { key: WindyOverlay; label: string; color: string }[] = [
  { key: 'wind', label: 'Wind', color: '#38bdf8' },
  { key: 'waves', label: 'Waves', color: '#06b6d4' },
  { key: 'currents', label: 'Currents', color: '#2dd4bf' },
  { key: 'swell', label: 'Swell', color: '#818cf8' },
];

function buildWindyUrl(overlay: WindyOverlay): string {
  return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=imperial&metricTemp=imperial&metricWind=mph&zoom=8&overlay=${overlay}&product=ecmwf&level=surface&lat=33.5&lon=-119.0&marker=true&calendar=now&pressure=true&type=map&menu=&message=true&forecast=12&theme=dark`;
}

export default function OceanDataScreen() {
  const [activeOverlay, setActiveOverlay] = useState<WindyOverlay>('wind');
  const [showSST, setShowSST] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ocean Data</Text>
        <View style={styles.liveBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* Overlay selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
      >
        {/* SST toggle */}
        <TouchableOpacity
          onPress={() => setShowSST(!showSST)}
          style={[styles.filterChip, showSST && styles.filterChipActiveGreen]}
        >
          <Text style={[styles.filterChipText, showSST && { color: colors.green }]}>SST</Text>
        </TouchableOpacity>

        {/* Windy overlays */}
        {WINDY_OVERLAYS.map(({ key, label, color }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveOverlay(key)}
            style={[
              styles.filterChip,
              activeOverlay === key && { borderColor: color, backgroundColor: color + '15' },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                activeOverlay === key && { color },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map area */}
      <View style={styles.mapContainer}>
        {/* SST overlay image */}
        {showSST && (
          <View style={styles.sstOverlay}>
            <Text style={styles.sstLabel}>SST Heatmap Active</Text>
          </View>
        )}

        {/* Windy embed */}
        <WebView
          source={{ uri: buildWindyUrl(activeOverlay) }}
          style={styles.webview}
          javaScriptEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Loading {activeOverlay} data...</Text>
            </View>
          )}
        />

        {/* Color scale legend */}
        <View style={styles.legend}>
          <Text style={styles.legendLabel}>
            {activeOverlay === 'wind' ? 'WIND SPEED' :
             activeOverlay === 'waves' ? 'WAVE HEIGHT' :
             activeOverlay === 'currents' ? 'CURRENT SPEED' : 'SWELL HEIGHT'}
          </Text>
        </View>
      </View>

      {/* Bottom info cards */}
      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>KELP DETECTION</Text>
          <Text style={styles.infoStatus}>No Data</Text>
          <Text style={styles.infoDetail}>Deploy service to activate</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>DRIFT PREDICTION</Text>
          <Text style={styles.infoStatus}>No Data</Text>
          <Text style={styles.infoDetail}>Deploy service to activate</Text>
        </View>
      </View>
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActiveGreen: { borderColor: colors.green, backgroundColor: colors.green + '15' },
  filterChipText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  mapContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  sstOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: colors.green + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.green + '40',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sstLabel: { fontSize: 10, color: colors.green, fontWeight: '600' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: colors.muted, fontSize: 14 },
  legend: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: colors.card + 'ee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  legendLabel: { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 1 },
  infoRow: { flexDirection: 'row', gap: 8, padding: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  infoLabel: { fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 1 },
  infoStatus: { fontSize: 13, color: colors.muted, fontWeight: '600', marginTop: 4 },
  infoDetail: { fontSize: 10, color: colors.muted, marginTop: 2 },
});
