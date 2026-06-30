/**
 * deviceManager.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central utility for multi-device login management.
 * Manages the `deviceLocations/{uid}` Firestore document.
 *
 * Schema:
 *   deviceLocations/{uid} → {
 *     uid, email,
 *     devices: [{
 *       deviceId, deviceName, browser, platform, os,
 *       ip, city, country, latitude, longitude,
 *       loginTime, lastActive
 *     }],
 *     createdAt, updatedAt
 *   }
 */

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "@/Firebase/firebase";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEVICE_ID_KEY = "avr_device_id_v2";
const MAX_DEVICES = 2;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface BrowserInfo {
  browser: string;
  platform: string;
  os: string;
  deviceName: string;
}

export interface LocationInfo {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  ip: string | null;
}

export interface DeviceEntry {
  deviceId: string;
  deviceName: string;
  browser: string;
  platform: string;
  os: string;
  ip: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  loginTime: any;  // Firestore Timestamp or Date
  lastActive: any;
}

export interface DeviceDocument {
  uid: string;
  email: string;
  devices: DeviceEntry[];
  createdAt: any;
  updatedAt: any;
}

// ─── Device ID ────────────────────────────────────────────────────────────────

/**
 * Generate a new unique device ID and persist it to localStorage.
 */
export function generateDeviceId(): string {
  const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

/**
 * Return existing device ID from localStorage, or create a new one.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
  }
  return id;
}

// ─── Browser / OS Detection ───────────────────────────────────────────────────

/**
 * Detect the current browser, platform, and OS from navigator.userAgent.
 */
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent;

  // Browser
  let browser = "Unknown Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Chromium/")) browser = "Chromium";

  // OS
  let os = "Unknown OS";
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone/.test(ua)) os = "iOS (iPhone)";
  else if (/iPad/.test(ua)) os = "iOS (iPad)";
  else if (/Linux/.test(ua)) os = "Linux";
  else if (/CrOS/.test(ua)) os = "ChromeOS";

  // Platform
  let platform = "Desktop";
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    platform = "Mobile";
  } else if (/iPad/i.test(ua)) {
    platform = "Tablet";
  }

  const deviceName = `${browser} on ${os}`;
  return { browser, platform, os, deviceName };
}

// ─── Location ─────────────────────────────────────────────────────────────────

/**
 * Request browser geolocation permission.
 * Returns coordinates or null values if denied/unavailable.
 */
export function getCurrentLocation(): Promise<{ latitude: number | null; longitude: number | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve({ latitude: null, longitude: null }),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}

/**
 * Reverse geocode a lat/lon to city and country using OpenStreetMap Nominatim.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ city: string | null; country: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error("Nominatim failed");
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.county || addr.state_district || null;
    const country = addr.country || null;
    return { city, country };
  } catch {
    return { city: null, country: null };
  }
}

/**
 * Try IP-based location as fallback.
 */
async function ipBasedLocation(): Promise<LocationInfo> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error("ipapi failed");
    const data = await res.json();
    return {
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      city: data.city || null,
      country: data.country_name || data.country || null,
      ip: data.ip || null,
    };
  } catch {
    return { latitude: null, longitude: null, city: null, country: null, ip: null };
  }
}

/**
 * Build full location info: IP-based detection.
 * We bypass HTML5 geolocation prompt entirely on authentication flows
 * to prevent UX blocks and authorization delay.
 */
export async function buildLocationInfo(): Promise<LocationInfo> {
  return ipBasedLocation();
}

// ─── Firestore Operations ─────────────────────────────────────────────────────

/**
 * Get the deviceLocations document for a user.
 */
export async function getDeviceDocument(uid: string): Promise<DeviceDocument | null> {
  const ref = doc(db, "deviceLocations", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as DeviceDocument;
}

/**
 * Create a brand-new deviceLocations document for a user with the first device.
 */
export async function createDeviceDocument(
  uid: string,
  email: string,
  device: Omit<DeviceEntry, "loginTime" | "lastActive">
): Promise<void> {
  const ref = doc(db, "deviceLocations", uid);
  const now = new Date();
  const entry: DeviceEntry = { ...device, loginTime: now, lastActive: now };
  await setDoc(ref, {
    uid,
    email,
    devices: [entry],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if the current device exists and update it, or enforce the limit and add it.
 * Returns { allowed: true } on success or { allowed: false, devices: DeviceEntry[] } when limit is hit.
 */
export async function saveDevice(
  uid: string,
  email: string,
  device: Omit<DeviceEntry, "loginTime" | "lastActive">
): Promise<{ allowed: boolean; devices?: DeviceEntry[] }> {
  const ref = doc(db, "deviceLocations", uid);
  const now = new Date();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  try {
    console.log("[saveDevice] auth:", auth, "currentUser:", auth?.currentUser, "uid:", uid);
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);

      if (!snap.exists()) {
        const entry: DeviceEntry = { ...device, loginTime: now, lastActive: now };
        transaction.set(ref, {
          uid,
          email,
          devices: [entry],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return { allowed: true };
      }

      const data = snap.data() as DeviceDocument;
      let devices = data.devices || [];

      // ─── Filter Stale Devices (older than 30 days) ───
      devices = devices.filter((d) => {
        const lastActiveTime = d.lastActive?.seconds
          ? d.lastActive.seconds * 1000
          : (d.lastActive instanceof Date ? d.lastActive.getTime() : Number(d.lastActive) || 0);
        return lastActiveTime > thirtyDaysAgo;
      });

      const idx = devices.findIndex((d) => d.deviceId === device.deviceId);

      if (idx >= 0) {
        // Device already registered — update timestamps & info
        devices[idx] = {
          ...devices[idx],
          ...device,
          lastActive: now,
        };
        transaction.update(ref, {
          devices,
          updatedAt: serverTimestamp(),
        });
        return { allowed: true };
      }

      // New device — check limit
      if (devices.length >= MAX_DEVICES) {
        return { allowed: false, devices };
      }

      // Add new device
      const entry: DeviceEntry = { ...device, loginTime: now, lastActive: now };
      devices.push(entry);
      transaction.update(ref, {
        devices,
        email,
        updatedAt: serverTimestamp(),
      });
      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error("Error in saveDevice transaction:", error);
    throw error;
  }
}

/**
 * Update the lastActive timestamp for the current device.
 */
export async function updateExistingDevice(uid: string, deviceId: string): Promise<void> {
  const ref = doc(db, "deviceLocations", uid);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() as DeviceDocument;
      const devices = data.devices || [];
      const idx = devices.findIndex((d) => d.deviceId === deviceId);
      if (idx < 0) return;
      devices[idx].lastActive = new Date();
      transaction.update(ref, {
        devices,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (err) {
    console.warn("Failed to update existing device timestamp:", err);
  }
}

/**
 * Remove the current device from the Firestore document during logout.
 */
export async function removeCurrentDevice(uid: string, deviceId: string): Promise<void> {
  const ref = doc(db, "deviceLocations", uid);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return;
      const data = snap.data() as DeviceDocument;
      const devices = (data.devices || []).filter((d) => d.deviceId !== deviceId);
      transaction.update(ref, {
        devices,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (err) {
    console.warn("Failed to remove current device:", err);
  }
}

/**
 * Remove a specific device by ID (admin/profile revoke).
 */
export async function revokeDevice(uid: string, deviceId: string): Promise<void> {
  await removeCurrentDevice(uid, deviceId);
}

/**
 * Delete the entire deviceLocations document (used on account deletion).
 */
export async function deleteDeviceDocument(uid: string): Promise<void> {
  await deleteDoc(doc(db, "deviceLocations", uid));
}

/**
 * Check how many devices a user has (without doing any mutation).
 */
export async function checkDeviceLimit(uid: string): Promise<number> {
  const existing = await getDeviceDocument(uid);
  return existing?.devices?.length ?? 0;
}
