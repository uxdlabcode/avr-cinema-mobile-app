import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getDeviceId, removeCurrentDevice } from "@/lib/deviceManager";

/**
 * useLogout hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Performs a clean logout:
 *   1. Removes the current device from `deviceLocations/{uid}`
 *   2. Signs out of Firebase Auth
 *   3. Clears session flags from sessionStorage
 *   4. Navigates to /signin
 */
export const useLogout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        const deviceId = getDeviceId();
        try {
          // Remove current device from `deviceLocations/{uid}` (new collection)
          await removeCurrentDevice(currentUser.uid, deviceId);
        } catch (err) {
          console.warn("[Logout] Failed to remove device from deviceLocations:", err);
        }
      }

      // Firebase sign out
      await auth.signOut();

      // Clear session flags
      localStorage.removeItem("userInfo");
      sessionStorage.removeItem("device_session_active");
      sessionStorage.removeItem("avr_session_device_id");

      navigate("/signin");
      return true;
    } catch (err) {
      console.error("[Logout] Error:", err);
      return false;
    }
  };

  return logout;
};