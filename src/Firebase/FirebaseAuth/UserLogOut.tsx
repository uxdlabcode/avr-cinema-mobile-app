import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getOrCreateDeviceId, revokeDeviceSession } from "@/lib/deviceUtils";


export const useLogout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      // Revoke current device session before signing out
      const currentUser = auth.currentUser;
      if (currentUser) {
        const deviceId = getOrCreateDeviceId();
        try {
          await revokeDeviceSession(currentUser.uid, deviceId);
        } catch (err) {
          console.warn("Failed to revoke device session:", err);
        }
      }

      await auth.signOut();
      localStorage.removeItem("userInfo");
      navigate("/signin");
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  return logout;
};