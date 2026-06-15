/**
 * Utility functions for Android TV detection and key mappings.
 */

export const isTvPlatform = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const ua = window.navigator.userAgent.toLowerCase();
  
  // Check typical TV User Agents
  const isTvUA = 
    ua.includes("smarttv") ||
    ua.includes("google-tv") ||
    ua.includes("googletv") ||
    ua.includes("androidtv") ||
    ua.includes("tizen") ||
    ua.includes("webos") ||
    ua.includes("leanback") ||
    ua.includes("firetv") ||
    ua.includes("appletv") ||
    ua.includes("xbox") ||
    ua.includes("playstation") ||
    ua.includes("tv");
  
  // Developer override for easy testing on desktop browsers
  const isForceTv = localStorage.getItem("force_tv_mode") === "true";
  
  return isTvUA || isForceTv;
};

// Android TV / standard D-pad Key Codes & Names
export const TV_KEYS = {
  UP: "ArrowUp",
  DOWN: "ArrowDown",
  LEFT: "ArrowLeft",
  RIGHT: "ArrowRight",
  ENTER: "Enter",
  BACK: "Escape", // Often mapped to Escape on web wrappers, or handled via history/android backbutton listener
  BACKSPACE: "Backspace",
};
