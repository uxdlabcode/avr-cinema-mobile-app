/**
 * DIAGNOSIS SCRIPT — Auth Form Layout Issue
 *
 * Problem:
 *  - isTvPlatform() checks navigator.userAgent for "tv", "sony", "sharp", etc.
 *  - It also matches "android" without "mobile" — this catches Chrome on desktop
 *    if the UA string ever contains "android".
 *  - BUT the critical bug: it matches "tv" as a SUBSTRING inside common strings
 *    like "activity", "connectivity", "native", etc. in the UA string.
 *
 * Specifically:  ua.includes("tv") matches:
 *   - "ac**tv**ity"   — present in many UA strings
 *   - "na**tv**e"
 *   - "connec**tv**ity"
 *   - etc.
 *
 * Impact:
 *  - On a normal desktop browser, isTvPlatform() returns TRUE because the UA
 *    contains "tv" as a substring somewhere.
 *  - The Signup/Signin page wrappers use isTvPlatform() to set max-w-4xl 
 *    and render the QR code panel.
 *  - The form uses flex-1 which shrinks when the QR panel appears.
 *  - Result: form is sometimes wide (max-w-md, no QR) and sometimes narrow
 *    (max-w-4xl with QR), appearing DIFFERENT on different renders/inputs.
 *
 * Observed symptoms:
 *  1. The page sometimes shows as centered full-width form (no QR).
 *  2. The page sometimes shows form + QR side-by-side (narrower form).
 *  3. "After filling 2-3 fields the QR appears" — because the UA check runs
 *     fresh each render, or localStorage "force_tv_mode" gets set somewhere.
 *
 * Root fix:
 *  - Change ua.includes("tv") to a whole-word check: /\btv\b/.test(ua)
 *    so it only matches "tv" as a standalone word, not as part of other words.
 *  - Also fix: (ua.includes("android") && !ua.includes("mobile")) — Chrome on 
 *    desktop may match if DevTools mobile emulation is toggled.
 *
 * Layout fix (secondary):
 *  - The Signup/Signin page wrapper should ALWAYS use max-w-4xl with the card 
 *    styling so the layout is stable regardless of isTV.
 *  - The QR code section inside the form should always be shown at lg breakpoint
 *    (remove the isTV gate, or always show it).
 */

const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "").toLowerCase();

console.log("User Agent:", ua);
console.log('ua.includes("tv"):', ua.includes("tv"));
console.log('/\\btv\\b/.test(ua):', /\btv\b/.test(ua));
console.log("Has 'android' without 'mobile':", ua.includes("android") && !ua.includes("mobile"));

// Show all substrings matching "tv"
const matches = [];
let idx = ua.indexOf("tv");
while (idx !== -1) {
  matches.push({ index: idx, context: ua.substring(Math.max(0, idx - 10), idx + 12) });
  idx = ua.indexOf("tv", idx + 1);
}
console.log("All 'tv' occurrences in UA:", matches);
