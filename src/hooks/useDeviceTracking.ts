/**
 * useDeviceTracking.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hooks for device tracking, location, and device limit enforcement.
 */

import { useState, useEffect, useCallback } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import {
  getDeviceDocument,
  checkDeviceLimit,
  getCurrentLocation,
  reverseGeocode,
  type DeviceEntry,
} from "@/lib/deviceManager";

// ─── useCurrentLocation ───────────────────────────────────────────────────────

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to request geolocation and perform reverse geocoding.
 * Triggers on mount by default.
 */
export function useCurrentLocation(triggerOnMount = false): LocationState & { request: () => void } {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    city: null,
    country: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const coords = await getCurrentLocation();
      if (coords.latitude !== null && coords.longitude !== null) {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        setState({
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: geo.city,
          country: geo.country,
          loading: false,
          error: null,
        });
      } else {
        setState({
          latitude: null,
          longitude: null,
          city: null,
          country: null,
          loading: false,
          error: "Location permission denied",
        });
      }
    } catch {
      setState((s) => ({ ...s, loading: false, error: "Failed to get location" }));
    }
  }, []);

  useEffect(() => {
    if (triggerOnMount) request();
  }, [triggerOnMount, request]);

  return { ...state, request };
}

// ─── useDeviceLimit ───────────────────────────────────────────────────────────

interface DeviceLimitState {
  count: number;
  isAtLimit: boolean;
  loading: boolean;
}

/**
 * Hook to check how many devices a user has registered.
 */
export function useDeviceLimit(uid: string | null | undefined): DeviceLimitState {
  const [state, setState] = useState<DeviceLimitState>({
    count: 0,
    isAtLimit: false,
    loading: true,
  });

  useEffect(() => {
    if (!uid) {
      setState({ count: 0, isAtLimit: false, loading: false });
      return;
    }
    checkDeviceLimit(uid).then((count) => {
      setState({ count, isAtLimit: count >= 2, loading: false });
    });
  }, [uid]);

  return state;
}

// ─── useDeviceTracking ────────────────────────────────────────────────────────

interface DeviceTrackingState {
  devices: DeviceEntry[];
  loading: boolean;
}

/**
 * Hook that provides a real-time view of the current user's registered devices.
 * Uses onSnapshot for live updates.
 */
export function useDeviceTracking(uid: string | null | undefined): DeviceTrackingState {
  const [state, setState] = useState<DeviceTrackingState>({
    devices: [],
    loading: true,
  });

  useEffect(() => {
    if (!uid) {
      setState({ devices: [], loading: false });
      return;
    }

    const ref = doc(db, "deviceLocations", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setState({ devices: (data.devices || []) as DeviceEntry[], loading: false });
        } else {
          setState({ devices: [], loading: false });
        }
      },
      () => setState((s) => ({ ...s, loading: false }))
    );

    return () => {
      unsub();
    };
  }, [uid]);

  return state;
}

/**
 * Hook that returns the devices document snapshot handler cleanup ref.
 * For usage inside components that need device list with real-time updates.
 */
export function useDeviceList(uid: string | null | undefined): {
  devices: DeviceEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!uid) {
      setDevices([]);
      setLoading(false);
      return;
    }
    const doc = await getDeviceDocument(uid);
    setDevices(doc?.devices || []);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { devices, loading, refetch };
}
