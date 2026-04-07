'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Detection, ProximityAlert, AlertRadius } from '@/lib/ocean-data/proximity';
import { checkProximity, ALERT_RADII } from '@/lib/ocean-data/proximity';

interface GPSState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null; // knots
  enabled: boolean;
  error: string | null;
}

interface UseGPSTrackingReturn {
  gps: GPSState;
  alerts: ProximityAlert[];
  alertRadius: AlertRadius;
  setAlertRadius: (r: AlertRadius) => void;
  startTracking: () => void;
  stopTracking: () => void;
  dismissAlert: (detectionId: string) => void;
}

// Suppress unused import warning — ALERT_RADII is exported from proximity for consumers
void ALERT_RADII;

export function useGPSTracking(detections: Detection[]): UseGPSTrackingReturn {
  const [gps, setGps] = useState<GPSState>({
    lat: null, lng: null, accuracy: null, heading: null, speed: null,
    enabled: false, error: null,
  });
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
  const [alertRadius, setAlertRadius] = useState<AlertRadius>(3);
  const alreadyAlerted = useRef(new Set<string>());
  const watchId = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGps(prev => ({ ...prev, error: 'GPS not available' }));
      return;
    }

    setGps(prev => ({ ...prev, enabled: true, error: null }));

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const speedKnots = pos.coords.speed ? pos.coords.speed * 1.94384 : null;
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: speedKnots,
          enabled: true,
          error: null,
        });
      },
      (err) => {
        setGps(prev => ({ ...prev, error: err.message }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setGps(prev => ({ ...prev, enabled: false }));
    setAlerts([]);
  }, []);

  // Check proximity whenever position or detections change
  useEffect(() => {
    if (gps.lat === null || gps.lng === null) return;

    const newAlerts = checkProximity(
      gps.lat, gps.lng, detections, alertRadius, alreadyAlerted.current,
    );

    if (newAlerts.length > 0) {
      // Mark as alerted so we don't re-alert
      for (const a of newAlerts) {
        alreadyAlerted.current.add(a.detection.id);
      }
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // keep latest 10
    }
  }, [gps.lat, gps.lng, detections, alertRadius]);

  const dismissAlert = useCallback((detectionId: string) => {
    setAlerts(prev => prev.filter(a => a.detection.id !== detectionId));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { gps, alerts, alertRadius, setAlertRadius, startTracking, stopTracking, dismissAlert };
}
