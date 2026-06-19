import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar/Navbar";
import { TVSidebar } from "@/components/navbar/TVSidebar";
import { isTvPlatform } from "@/lib/tvUtils";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { setNotifications, setLoading, setError } from "@/store/slices/notificationSlice";

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const isTV = isTvPlatform();
  const [isMobileWidth, setIsMobileWidth] = useState(false);
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!user?.id) return;

    dispatch(setLoading(true));

    const qUserNotifs = query(collection(db, "notifications"), where("userId", "==", user.id));
    const unsubUserNotifs = onSnapshot(
      qUserNotifs,
      (userNotifsSnap) => {
        const userNotifsList = userNotifsSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Update",
            description: data.description || "",
            type: (data.type || "membership") as "membership" | "quiz" | "upcoming" | "upcoming_upload",
            image: data.image || "/assets/poster.png",
            read: data.read || false,
            createdAt: data.createdAt || Date.now(),
            link: data.link || "/profile",
          };
        });

        const unsubMedia = onSnapshot(
          collection(db, "media"),
          (mediaSnap) => {
            let readIds: string[] = [];
            try {
              readIds = JSON.parse(localStorage.getItem("avr_read_notifications") || "[]");
            } catch {
              readIds = [];
            }

            const mediaNotifsList = mediaSnap.docs.map((doc) => {
              const data = doc.data();
              const time = data.createdAt?.toMillis?.() || new Date(data.createdAt || 0).getTime() || Date.now();
              const isUpcoming = data.status === "upcoming" || data.isUpcoming === true || data.upcoming === true || data.category?.toLowerCase() === "upcoming";

              return {
                id: `media_${doc.id}`,
                title: data.title || "media",
                category: data.category || "Movie",
                description: data.description || (isUpcoming 
                  ? `Get ready! The upcoming ${data.category || "Movie"} "${data.title || "media"}" is releasing soon.`
                  : `Watch the newly added ${data.category || "Movie"} "${data.title || "media"}" now streaming.`),
                type: (isUpcoming ? "upcoming_upload" : "media_upload") as "media_upload" | "upcoming_upload",
                image: data.thumbnailUrl || "/assets/poster.png",
                read: readIds.includes(`media_${doc.id}`),
                createdAt: time,
                link: `/video/${doc.id}`,
              };
            });

            const combined = [...userNotifsList, ...mediaNotifsList].sort(
              (a, b) => b.createdAt - a.createdAt
            );

            dispatch(setNotifications(combined));
          },
          (err) => {
            dispatch(setError(err.message));
          }
        );

        return () => unsubMedia();
      },
      (err) => {
        dispatch(setError(err.message));
      }
    );

    return () => unsubUserNotifs();
  }, [user?.id, dispatch]);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobileWidth(window.innerWidth < 768);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const showSidebar = !isMobileWidth;

  return (
    <div 
      className={`min-h-screen bg-[#141414] text-white flex relative ${
        showSidebar ? "flex-row pl-[80px]" : "flex-col pb-16 md:pb-0"
      }`}
    >
      {showSidebar ? <TVSidebar /> : <Navbar />}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[100vw] flex flex-col overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
