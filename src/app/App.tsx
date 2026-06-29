import { useEffect, useRef } from "react";
import { useRoutes, useLocation, useNavigate } from "react-router-dom";
import { appRoutes } from "./router";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser, logout } from "@/store/slices/authSlice";
import { onIdTokenChanged } from "firebase/auth";
import { onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/Firebase/firebase";
import {
  getDeviceId,
  createDeviceDocument,
  updateExistingDevice,
  getBrowserInfo,
  buildLocationInfo,
} from "@/lib/deviceManager";
import { toast } from "sonner";

function App() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const deviceRevocationListenedRef = useRef(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeDeviceDoc: (() => void) | null = null;
    let heartbeatInterval: any = null;

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      // Cleanup previous listeners & intervals
      if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
      if (unsubscribeDeviceDoc) { unsubscribeDeviceDoc(); unsubscribeDeviceDoc = null; }
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      deviceRevocationListenedRef.current = false;

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const uid = firebaseUser.uid;
          const deviceId = getDeviceId();

          const triggerForceSignOut = (message: string) => {
            if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
            if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
            if (unsubscribeDeviceDoc) { unsubscribeDeviceDoc(); unsubscribeDeviceDoc = null; }

            toast.error(message);
            auth.signOut().then(() => {
              sessionStorage.removeItem("device_session_active");
              sessionStorage.removeItem("avr_session_device_id");
              sessionStorage.removeItem("device_limit_blocked");
              localStorage.removeItem("userInfo");
              navigate("/signin?revoked=true");
            });
          };

          const startUserDocListener = () => {
            if (unsubscribeUserDoc) return; // already listening

            const userDocRef = doc(db, "users", uid);
            unsubscribeUserDoc = onSnapshot(
              userDocRef,
              (docSnapshot) => {
                if (docSnapshot.exists()) {
                  const userData = docSnapshot.data();
                  const role = (userData.role || "user").toLowerCase();

                  const expiryTime = userData.membershipExpiryDate?.seconds
                    ? userData.membershipExpiryDate.seconds * 1000
                    : userData.membershipExpiryDate instanceof Date
                    ? userData.membershipExpiryDate.getTime()
                    : Number(userData.membershipExpiryDate) || 0;

                  if (userData.membershipStatus === "active" && expiryTime > 0 && Date.now() > expiryTime) {
                    import("@/Firebase").then(async ({ updateDocument, addDocument }) => {
                      try {
                        await updateDocument("users", docSnapshot.id, {
                          membershipStatus: "expired",
                          updatedAt: new Date(),
                        });
                        await addDocument("notifications", {
                          userId: docSnapshot.id,
                          uid: docSnapshot.id,
                          planId: userData.membershipPlanId || "",
                          startDate: userData.membershipStartDate?.seconds
                            ? userData.membershipStartDate.seconds * 1000
                            : Number(userData.membershipStartDate) || Date.now(),
                          endDate: expiryTime,
                          title: "Subscription Expired 👑",
                          description: `Your subscription plan has ended. Renew now to continue enjoying AVR Cinema!`,
                          type: "membership",
                          image: "/assets/headerLogo.png",
                          read: false,
                          createdAt: Date.now(),
                          link: "/profile",
                        });
                      } catch (err) {
                        console.error("Failed to process membership expiration:", err);
                      }
                    });
                  }

                  dispatch(
                    setAuthUser({
                      user: {
                        id: docSnapshot.id,
                        email: firebaseUser.email || userData.email || "",
                        role,
                        name: userData.name,
                        displayName: userData.displayName || userData.name || firebaseUser.displayName || "",
                        phone: userData.phone || "",
                        avatar: userData.avatar || "",
                        membershipPlanId: userData.membershipPlanId,
                        membershipStatus: userData.membershipStatus,
                        membershipStartDate: userData.membershipStartDate?.seconds
                          ? userData.membershipStartDate.seconds * 1000
                          : userData.membershipStartDate instanceof Date
                          ? userData.membershipStartDate.getTime()
                          : Number(userData.membershipStartDate) || undefined,
                        membershipExpiryDate: userData.membershipExpiryDate?.seconds
                          ? userData.membershipExpiryDate.seconds * 1000
                          : userData.membershipExpiryDate instanceof Date
                          ? userData.membershipExpiryDate.getTime()
                          : Number(userData.membershipExpiryDate) || undefined,
                        lastPaymentId: userData.lastPaymentId,
                      },
                      token,
                    })
                  );
                } else {
                  dispatch(
                    setAuthUser({
                      user: {
                        id: firebaseUser.uid,
                        email: firebaseUser.email || "",
                        role: "user",
                        name: firebaseUser.displayName || "",
                        displayName: firebaseUser.displayName || "",
                        phone: firebaseUser.phoneNumber || "",
                        avatar: firebaseUser.photoURL || "",
                      },
                      token,
                    })
                  );
                }
              },
              (error) => {
                console.error("Error listening to user document", error);
              }
            );
          };

          // ─── Real-time device locations listener ───
          unsubscribeDeviceDoc = onSnapshot(
            doc(db, "deviceLocations", uid),
            async (snap) => {
              if (snap.exists()) {
                const devices: any[] = snap.data()?.devices || [];
                const isStillRegistered = devices.some((d: any) => d.deviceId === deviceId);

                if (isStillRegistered) {
                  // Mark session active & start user document listener
                  sessionStorage.setItem("device_session_active", "true");
                  sessionStorage.setItem("avr_session_device_id", deviceId);
                  deviceRevocationListenedRef.current = true;

                  startUserDocListener();

                  // Heartbeat initialization if not already set
                  if (!heartbeatInterval) {
                    updateExistingDevice(uid, deviceId); // Run immediately
                    heartbeatInterval = setInterval(() => {
                      updateExistingDevice(uid, deviceId);
                    }, 10 * 60 * 1000); // Heartbeat every 10 minutes
                  }
                } else {
                  // Device is NOT in the active devices list.
                  // If we are currently logging in, wait for the login thunk to finish.
                  if (sessionStorage.getItem("avr_login_pending") === "true") return;

                  // If we are currently blocked by device limit, don't force log out!
                  // This keeps the user authenticated temporarily so they can perform revocation.
                  if (sessionStorage.getItem("device_limit_blocked") === "true") return;

                  // If we had active listener flag set, this is a remote revocation.
                  // If not, it means the login check rejected us, so log out immediately.
                  const hadActiveSession = deviceRevocationListenedRef.current || sessionStorage.getItem("device_session_active") === "true";
                  triggerForceSignOut(
                    hadActiveSession
                      ? "You've been logged out from this device remotely."
                      : "Unauthorized session or device limit exceeded."
                  );
                }
              } else {
                // The device document does not exist (legacy user or deletion)
                if (sessionStorage.getItem("avr_login_pending") === "true") return;

                if (deviceRevocationListenedRef.current) {
                  // If we were already registered before, this means account deletion or admin purge!
                  triggerForceSignOut("Your session has been terminated.");
                } else {
                  // Legacy User Self-healing: Register this device as the first device
                  try {
                    const browserInfo = getBrowserInfo();
                    const locationInfo = await buildLocationInfo();
                    await createDeviceDocument(uid, firebaseUser.email || "", {
                      deviceId,
                      deviceName: browserInfo.deviceName,
                      browser: browserInfo.browser,
                      platform: browserInfo.platform,
                      os: browserInfo.os,
                      ip: locationInfo.ip,
                      city: locationInfo.city,
                      country: locationInfo.country,
                      latitude: locationInfo.latitude,
                      longitude: locationInfo.longitude,
                    });
                    // This creation will trigger the onSnapshot again, completing login.
                  } catch (err) {
                    console.error("Self-healing device registration failed:", err);
                    triggerForceSignOut("Failed to register device session.");
                  }
                }
              }
            },
            (err) => {
              console.warn("[DeviceWatch] Snapshot error:", err);
              // Fallback: start user listener anyway if Firebase fails to read (e.g. offline/rules)
              startUserDocListener();
            }
          );

        } catch (error) {
          console.error("Error hydrating user", error);
          dispatch(logout());
        }
      } else {
        dispatch(logout());
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeDeviceDoc) unsubscribeDeviceDoc();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [dispatch, navigate]);

  return useRoutes(appRoutes);
}

export default App;
