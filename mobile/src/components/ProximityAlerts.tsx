import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { apiFetch } from '../lib/api';
import { bearingToCompass, checkProximity } from '../lib/proximity';
import type { Detection, ProximityAlert, AlertRadius } from '../lib/proximity';

const ALERT_RADII: AlertRadius[] = [1, 3, 5, 10];

interface Props {
  onNavigateToPoint?: (lat: number, lng: number) => void;
}

export default function ProximityAlerts({ onNavigateToPoint }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
  const [alertRadius, setAlertRadius] = useState<AlertRadius>(3);
  const [speed, setSpeed] = useState<number | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const alreadyAlerted = useRef(new Set<string>());
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Fetch detections on mount
  useEffect(() => {
    async function fetchDetections() {
      try {
        const sightings = await apiFetch<any[]>('/api/kelp-sightings');
        const dets: Detection[] = (sightings || [])
          .filter((s: any) => s.status !== 'expired')
          .map((s: any) => ({
            id: `sighting-${s.id}`,
            lat: s.lat,
            lng: s.lng,
            type: 'kelp-sighting' as const,
            label: s.description || 'Kelp sighting',
            confidence: s.verification_count >= 3 ? 0.9 : 0.5,
          }));
        setDetections(dets);
      } catch {
        // Silent fail
      }
    }
    fetchDetections();
  }, []);

  const startTracking = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'GPS access is required for proximity alerts');
      return;
    }

    setEnabled(true);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        const speedKnots = location.coords.speed ? location.coords.speed * 1.94384 : null;
        setSpeed(speedKnots);

        const newAlerts = checkProximity(
          location.coords.latitude,
          location.coords.longitude,
          detections,
          alertRadius,
          alreadyAlerted.current,
        );

        if (newAlerts.length > 0) {
          for (const a of newAlerts) alreadyAlerted.current.add(a.detection.id);
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));

          // Haptic/vibrate for the first alert
          if (Platform.OS !== 'web') {
            // Vibration would go here
          }
        }
      },
    );
  }, [detections, alertRadius]);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setEnabled(false);
    setAlerts([]);
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.detection.id !== id));
  }, []);

  return (
    <View>
      {/* Alert banners */}
      {alerts.slice(0, 3).map((alert) => {
        const dir = bearingToCompass(alert.bearing);
        const dist = alert.distanceNM < 1
          ? `${(alert.distanceNM * 2025.37).toFixed(0)}yds`
          : `${alert.distanceNM.toFixed(1)}nm`;

        return (
          <TouchableOpacity
            key={alert.detection.id}
            onPress={() => onNavigateToPoint?.(alert.detection.lat, alert.detection.lng)}
            style={styles.alertBanner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>
                🌿 Kelp — {dist} {dir}
              </Text>
              <Text style={styles.alertDetail}>{alert.detection.label}</Text>
            </View>
            <TouchableOpacity onPress={() => dismissAlert(alert.detection.id)}>
              <Text style={styles.dismissBtn}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      {/* GPS toggle */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => enabled ? stopTracking() : startTracking()}
          style={[styles.gpsBtn, enabled && styles.gpsBtnActive]}
        >
          <Text style={[styles.gpsBtnText, enabled && styles.gpsBtnTextActive]}>
            {enabled ? `GPS · ${alertRadius}nm${speed != null && speed > 1 ? ` · ${speed.toFixed(0)}kts` : ''}` : 'GPS Off'}
          </Text>
        </TouchableOpacity>

        {enabled && (
          <View style={styles.radiusRow}>
            {ALERT_RADII.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setAlertRadius(r)}
                style={[styles.radiusChip, r === alertRadius && styles.radiusChipActive]}
              >
                <Text style={[styles.radiusText, r === alertRadius && styles.radiusTextActive]}>
                  {r}nm
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alertBanner: {
    backgroundColor: 'rgba(13,19,32,0.95)',
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTitle: { color: colors.green, fontSize: 14, fontWeight: '700' },
  alertDetail: { color: colors.muted, fontSize: 11, marginTop: 2 },
  dismissBtn: { color: colors.muted, fontSize: 20, paddingHorizontal: 8 },
  controls: { marginTop: 8 },
  gpsBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  gpsBtnActive: {
    backgroundColor: colors.green + '15',
    borderColor: colors.green,
  },
  gpsBtnText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  gpsBtnTextActive: { color: colors.green },
  radiusRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  radiusChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  radiusChipActive: { borderColor: colors.green, backgroundColor: colors.green + '20' },
  radiusText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  radiusTextActive: { color: colors.green },
});
