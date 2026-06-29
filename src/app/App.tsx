import { useEffect, useRef } from "react";
import { useRoutes, useLocation, useNavigate } from "react-router-dom";
import { appRoutes } from "./router";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser, logout } from "@/store/slices/authSlice";
import { onIdTokenChanged } from "firebase/auth";
import { onSnapshot, doc } from "firebase/firestore";
import { auth, db } from "@/Firebase/firebase";
import { getOrCreateDeviceId, getDeviceName, getDeviceLocation, recordDeviceLogin } from "@/lib/deviceUtils";
import { toast } from "sonner";

function App() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const deviceRecordStatusRef = useRef<'idle' | 'recording' | 'recorded' | 'failed'>('idle');

  // Scroll to top on route change (triggered)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onIdTokenChanged(auth, async (firebaseUser) => {
      // Clean up previous Firestore document listener if any
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (firebaseUser) {
        try {
          // Get the actual JWT which automatically handles refresh tokens
          const token = await firebaseUser.getIdToken();

          // ─── Record device login (once per session) ───
          if (deviceRecordStatusRef.current === 'idle') {
            deviceRecordStatusRef.current = 'recording';
            const deviceId = getOrCreateDeviceId();
            const deviceName = getDeviceName();
            console.log("[DeviceTracking] Recording device login...", { userId: firebaseUser.uid, deviceId, deviceName });
            getDeviceLocation().then((loc) => {
              console.log("[DeviceTracking] Location fetched:", loc);
              recordDeviceLogin({
                userId: firebaseUser.uid,
                deviceId,
                deviceName,
                location: loc,
              })
                .then((res) => {
                  console.log("[DeviceTracking] ✅ Device recorded successfully:", res?.data);
                  deviceRecordStatusRef.current = 'recorded';
                })
                .catch((err) => {
                  console.error("[DeviceTracking] ❌ recordDeviceLogin FAILED:", err);
                  deviceRecordStatusRef.current = 'failed';
                });
            });
          }

          const userDocRef = doc(db, "users", firebaseUser.uid);
          
          unsubscribeDoc = onSnapshot(
            userDocRef,
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const role = (userData.role || "user").toLowerCase();

                // ─── Remote device revocation check ───
                const loginDevices: string[] = userData.loginDevices || [];
                const currentDeviceId = getOrCreateDeviceId();
                const hasBeenRecorded = deviceRecordStatusRef.current === 'recorded' || loginDevices.includes(currentDeviceId);
                if (hasBeenRecorded && loginDevices.length > 0 && !loginDevices.includes(currentDeviceId)) {
                  // This device has been revoked remotely
                  toast.error("You have been logged out from another device.");
                  auth.signOut().then(() => {
                    localStorage.removeItem("userInfo");
                    navigate("/signin?revoked=true");
                  });
                  return;
                }

                const expiryTime = userData.membershipExpiryDate?.seconds
                  ? userData.membershipExpiryDate.seconds * 1000
                  : (userData.membershipExpiryDate instanceof Date 
                      ? userData.membershipExpiryDate.getTime() 
                      : Number(userData.membershipExpiryDate) || 0);

                if (userData.membershipStatus === "active" && expiryTime > 0 && Date.now() > expiryTime) {
                  import("@/Firebase").then(async ({ updateDocument, addDocument }) => {
                    try {
                      await updateDocument("users", docSnapshot.id, {
                        membershipStatus: "expired",
                        updatedAt: new Date()
                      });
                      await addDocument("notifications", {
                        userId: docSnapshot.id,
                        uid: docSnapshot.id,
                        planId: userData.membershipPlanId || "",
                        startDate: userData.membershipStartDate?.seconds
                          ? userData.membershipStartDate.seconds * 1000
                          : (userData.membershipStartDate instanceof Date 
                              ? userData.membershipStartDate.getTime() 
                              : Number(userData.membershipStartDate) || Date.now()),
                        endDate: expiryTime,
                        title: "Subscription Expired 👑",
                        description: `Your subscription plan has ended. Renew now to continue enjoying AVR Cinema!`,
                        type: "membership",
                        image: "/assets/headerLogo.png",
                        read: false,
                        createdAt: Date.now(),
                        link: "/profile"
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
                        : (userData.membershipStartDate instanceof Date 
                            ? userData.membershipStartDate.getTime() 
                            : Number(userData.membershipStartDate) || undefined),
                      membershipExpiryDate: userData.membershipExpiryDate?.seconds
                        ? userData.membershipExpiryDate.seconds * 1000
                        : (userData.membershipExpiryDate instanceof Date 
                            ? userData.membershipExpiryDate.getTime() 
                            : Number(userData.membershipExpiryDate) || undefined),
                      lastPaymentId: userData.lastPaymentId,
                    },
                    token,
                  })
                );
              } else {
                // Document doesn't exist yet, fall back to basic auth info
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
        } catch (error) {
          console.error("Error hydrating user", error);
          dispatch(logout());
        }
      } else {
        deviceRecordStatusRef.current = 'idle';
        dispatch(logout());
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, [dispatch, navigate]);

  return useRoutes(appRoutes);
}

export default App;
