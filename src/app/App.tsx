import { useEffect } from "react";
import { useRoutes, useLocation } from "react-router-dom";
import { appRoutes } from "./router";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser, setAuthLoading, logout } from "@/store/slices/authSlice";
import { onIdTokenChanged } from "firebase/auth";
import { getMatchingData } from "@/Firebase";
import { auth } from "@/Firebase/firebase";

function App() {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          const users = await getMatchingData("users", "email", "==", user.email);
          const userDoc = users && users.length > 0 ? users[0] : null;
          const role = (userDoc?.role || "user").toLowerCase();
          
          // Get the actual JWT which automatically handles refresh tokens
          const token = await user.getIdToken();

          dispatch(
            setAuthUser({
              user: {
                id: userDoc?.id || user.uid,
                email: user.email || "",
                role,
                name: userDoc?.name,
                phone: userDoc?.phone || "",
                avatar: userDoc?.avatar || "",
              },
              token,
            })
          );
        } catch (error) {
          console.error("Error hydrating user", error);
          dispatch(logout());
        }
      } else {
        dispatch(logout());
      }
    });
    
    return () => unsubscribe();
  }, [dispatch]);

  return useRoutes(appRoutes);
}

export default App;
