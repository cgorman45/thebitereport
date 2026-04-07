import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import ProximityAlerts from '../components/ProximityAlerts';
import ReportFishModal from '../components/ReportFishModal';
import FishReportCard from '../components/FishReportCard';
import { apiFetch } from '../lib/api';

type WindyOverlay = 'wind' | 'waves' | 'currents' | 'swell';

const WINDY_OVERLAYS: { key: WindyOverlay; label: string; color: string }[] = [
  { key: 'wind', label: 'Wind', color: '#38bdf8' },
  { key: 'waves', label: 'Waves', color: '#06b6d4' },
  { key: 'currents', label: 'Currents', color: '#2dd4bf' },
  { key: 'swell', label: 'Swell', color: '#818cf8' },
];

function buildWindyUrl(overlay: WindyOverlay): string {
  return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=imperial&metricTemp=imperial&metricWind=mph&zoom=8&overlay=${overlay}&product=ecmwf&level=surface&lat=33.5&lon=-119.0&marker=true&calendar=now&pressure=true&type=map&menu=&message=true&forecast=12&theme=dark`;
}

interface FishReport {
  id: string;
  species: string;
  quantity: string;
  bait?: string | null;
  display_name?: string | null;
  created_at: string;
  verification_count?: number;
}

export default function OceanDataScreen() {
  const [activeOverlay, setActiveOverlay] = useState<WindyOverlay>('wind');
  const [showSST, setShowSST] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [fishReports, setFishReports] = useState<FishReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchFishReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await apiFetch<{ reports?: FishReport[] } | FishReport[]>('/api/fish-reports');
      const list = Array.isArray(data) ? data : (data as { reports?: FishReport[] }).reports ?? [];
      setFishReports(list.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch fish reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchFishReports();
  }, [fetchFishReports]);

  async function handleReportFishPress() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location required',
        'Allow location access so we can tag your fish report accurately.',
      );
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    setReportModalVisible(true);
  }

  function handleModalClose() {
    setReportModalVisible(false);
  }

  function handleModalSubmit() {
    setReportModalVisible(false);
    Alert.alert('Report submitted!', 'Thanks for sharing the bite info.');
    fetchFishReports();
  }

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

      {/* Proximity alerts + GPS toggle */}
      <View style={styles.proximityContainer}>
        <ProximityAlerts />
      </View>

      {/* Report Fish button */}
      <View style={styles.reportBtnContainer}>
        <TouchableOpacity style={styles.reportBtn} onPress={handleReportFishPress}>
          <Text style={styles.reportBtnText}>🐟 Report Fish Activity</Text>
        </TouchableOpacity>
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

      {/* Recent fish reports */}
      {(fishReports.length > 0 || loadingReports) && (
        <View style={styles.reportsSection}>
          <Text style={styles.reportsSectionLabel}>RECENT FISH REPORTS</Text>
          {loadingReports && fishReports.length === 0 ? (
            <Text style={styles.reportsLoading}>Loading...</Text>
          ) : (
            fishReports.map((report) => (
              <FishReportCard
                key={report.id}
                species={report.species}
                quantity={report.quantity}
                bait={report.bait}
                display_name={report.display_name}
                created_at={report.created_at}
                verification_count={report.verification_count}
              />
            ))
          )}
        </View>
      )}

      {/* Report Fish Modal */}
      <ReportFishModal
        visible={reportModalVisible}
        lat={currentLocation?.lat ?? 33.5}
        lng={currentLocation?.lng ?? -119.0}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
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
    paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 11, color: colors.green, fontWeight: '600' },
  proximityContainer: { paddingHorizontal: 12, paddingBottom: 4 },
  reportBtnContainer: { paddingHorizontal: 12, paddingBottom: 8 },
  reportBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent + '60',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reportBtnText: { fontSize: 13, color: colors.accent, fontWeight: '700' },
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
  reportsSection: { paddingHorizontal: 12, paddingBottom: 12 },
  reportsSectionLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  reportsLoading: { fontSize: 12, color: colors.muted, textAlign: 'center', paddingVertical: 8 },
});
