import { getFunctions, httpsCallable } from "firebase/functions";

// ─── Device ID (persistent per browser) ───
const DEVICE_ID_KEY = "avr_device_id";

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ─── Device Name (browser + OS) ───
export function getDeviceName(): string {
  const ua = navigator.userAgent;

  // Detect browser
  let browser = "Unknown Browser";
  if (ua.includes("Edg/")) browser = "Microsoft Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Google Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("Windows NT 10")) os = "Windows";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("CrOS")) os = "ChromeOS";

  return `${browser} on ${os}`;
}

// ─── Device Location (IP-based) ───
export interface DeviceLocation {
  city: string;
  region: string;
  country: string;
  ip: string;
}

export async function getDeviceLocation(): Promise<DeviceLocation> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("Location fetch failed");
    const data = await res.json();
    return {
      city: data.city || "Unknown",
      region: data.region || "",
      country: data.country_name || data.country || "Unknown",
      ip: data.ip || "",
    };
  } catch {
    return { city: "Unknown", region: "", country: "Unknown", ip: "" };
  }
}

// ─── Cloud Function wrappers ───
export interface RecordDevicePayload {
  userId: string;
  deviceId: string;
  deviceName: string;
  location: DeviceLocation;
}

export async function recordDeviceLogin(payload: RecordDevicePayload) {
  const functions = getFunctions();
  const fn = httpsCallable(functions, "recordDeviceLogin");
  return fn(payload);
}

export async function revokeDeviceSession(userId: string, deviceId: string) {
  const functions = getFunctions();
  const fn = httpsCallable(functions, "revokeDeviceSession");
  return fn({ userId, deviceId });
}
