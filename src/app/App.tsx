import { useEffect } from "react";
import { useRoutes } from "react-router-dom";
import { appRoutes } from "./router";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser, setAuthLoading, logout } from "@/store/slices/authSlice";
import { onAuthStateChanged } from "firebase/auth";
import { getMatchingData } from "@/Firebase";
import { auth } from "@/Firebase/firebase";

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const users = await getMatchingData("users", "email", "==", user.email);
          const userDoc = users && users.length > 0 ? users[0] : null;
          const role = (userDoc?.role || "user").toLowerCase();

          dispatch(
            setAuthUser({
              user: {
                id: userDoc?.id || user.uid,
                email: user.email || "",
                role,
                name: userDoc?.name,
              },
              token: "firebase-managed-token",
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
