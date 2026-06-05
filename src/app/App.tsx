import { useEffect } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { appRoutes } from "./router";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser, logout } from "@/store/slices/authSlice";
import { onIdTokenChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/Firebase/firebase";

function App() {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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

          if (firebaseUser.email) {
            const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
            
            unsubscribeDoc = onSnapshot(
              q,
              (querySnapshot) => {
                if (!querySnapshot.empty) {
                  const userDoc = querySnapshot.docs[0];
                  const userData = userDoc.data();
                  const role = (userData.role || "user").toLowerCase();

                  dispatch(
                    setAuthUser({
                      user: {
                        id: userDoc.id,
                        email: firebaseUser.email || "",
                        role,
                        name: userData.name,
                        displayName: userData.displayName || userData.name || firebaseUser.displayName || "",
                        phone: userData.phone || "",
                        avatar: userData.avatar || "",
                        membershipPlanId: userData.membershipPlanId,
                        membershipStatus: userData.membershipStatus,
                        membershipStartDate: userData.membershipStartDate?.seconds
                          ? userData.membershipStartDate.seconds * 1000
                          : userData.membershipStartDate,
                        membershipExpiryDate: userData.membershipExpiryDate?.seconds
                          ? userData.membershipExpiryDate.seconds * 1000
                          : userData.membershipExpiryDate,
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
          } else {
            // No email, set basic user auth object
            dispatch(
              setAuthUser({
                user: {
                  id: firebaseUser.uid,
                  email: "",
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
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, [dispatch]);

  return useRoutes(appRoutes);
}

export default App;
