import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { LogOut, Trash2, Pencil, ChevronDown, ChevronRight, Trophy, HelpCircle, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogout } from "@/Firebase/FirebaseAuth/UserLogOut";
import { deleteUserData } from "@/Firebase/FirebaseAuth/DeleteUser";
import { useNavigate } from "react-router-dom";
import LogoImage from "@/assets/Media (3) 1.png";
import { db } from "@/Firebase/firebase";
import { getSignedUrl } from "@/Firebase";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { getCollectionData } from "@/Firebase/CloudFirestore/GetData";

interface ContinueItem {
  id: string;
  movieId: string;
  title: string;
  poster: string;
  progress: number;
}

export const ProfilePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const logout = useLogout();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [continueWatching, setContinueWatching] = useState<ContinueItem[]>([]);
  const [loadingContinue, setLoadingContinue] = useState(true);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // Fetch Watchlist (my_list)
  useEffect(() => {
    if (!user?.id) {
      setLoadingWatchlist(false);
      return;
    }

    const fetchWatchlist = async () => {
      try {
        const q = query(collection(db, "my_list"), where("userId", "==", user.id));
        const querySnapshot = await getDocs(q);
        const items: any[] = [];
        for (const d of querySnapshot.docs) {
          const itemData = d.data();
          if (itemData.image) {
            try {
              itemData.image = await getSignedUrl(itemData.image);
            } catch {
              // fallback to raw url
            }
          }
          items.push({ id: d.id, ...itemData });
        }
        setWatchlist(items);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
      } finally {
        setLoadingWatchlist(false);
      }
    };

    fetchWatchlist();
  }, [user?.id]);

  // Fetch Continue Watching (watch_progress)
  useEffect(() => {
    if (!user?.id) {
      setLoadingContinue(false);
      return;
    }

    const fetchContinueWatching = async () => {
      try {
        const q = query(collection(db, "watch_progress"), where("userId", "==", user.id));
        const snap = await getDocs(q);
        const raw: any[] = [];
        snap.forEach((d) => raw.push({ id: d.id, ...d.data() }));

        // Sort by latest updated, show all items (only skip if duration is 0)
        const sorted = raw
          .filter((r) => r.duration > 0)
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        // Enrich with media title + thumbnail
        const enriched: ContinueItem[] = await Promise.all(
          sorted.map(async (r) => {
            let title = "Unknown";
            let poster = "/assets/episode1.webp";
            try {
              const mediaDoc = await getDoc(doc(db, "media", r.movieId));
              if (mediaDoc.exists()) {
                const data = mediaDoc.data();
                title = data.title || "Unknown";
                if (data.thumbnailUrl) {
                  try {
                    poster = await getSignedUrl(data.thumbnailUrl);
                  } catch {
                    poster = data.thumbnailUrl;
                  }
                }
              }
            } catch {/* ignore */}
            return {
              id: r.id,
              movieId: r.movieId,
              title,
              poster,
              progress: Math.round((r.currentTime / r.duration) * 100),
            };
          })
        );

        setContinueWatching(enriched);
      } catch (err) {
        console.error("Error fetching continue watching:", err);
      } finally {
        setLoadingContinue(false);
      }
    };

    fetchContinueWatching();
  }, [user?.id]);

  // Fetch Quizzes
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoadingQuizzes(true);
        const data = await getCollectionData("quizzes");
        setQuizzes(data as any[]);
      } catch (err) {
        console.error("Error fetching quizzes:", err);
      } finally {
        setLoadingQuizzes(false);
      }
    };
    fetchQuizzes();
  }, []);

  const name = user?.name || "Super Admin";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    const success = await deleteUserData(user.id);
    setIsDeleting(false);
    if (success) {
      setShowDeleteModal(false);
      logout();
    } else {
      alert("Failed to delete account. You may need to log out and log in again before deleting your account.");
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex flex-col gap-5 px-4 pt-8 pb-24">

          {/* Top Bar — Logo + Logout */}
          <div className="flex items-center justify-between">
            <img src={LogoImage} alt="AVR Cinema" className="h-10 w-auto object-contain" />
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex items-center gap-1.5 text-destructive font-semibold text-sm hover:opacity-80 transition-opacity"
              id="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>

          {/* User Info Card */}
          <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-2xl">
            <Avatar className="w-14 h-14 ring-2 ring-border shadow-lg">
              <AvatarImage src={user?.avatar || ""} className="object-cover" />
              <AvatarFallback className="bg-muted text-foreground text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-bold text-base truncate">{name}</p>
              <p className="text-muted-foreground text-sm truncate">
                {user?.email || "sarah@gmail.com"}
              </p>
            </div>
            <button
              onClick={() => navigate("/update-profile")}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              id="edit-profile-btn"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tier + Upgrade Row */}
          <div className="flex items-center justify-between">
            <div>
              <button className="flex items-center gap-1 text-primary-foreground font-semibold text-sm">
                Tier 2 <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <p className="text-muted-foreground text-xs mt-0.5">
                {user?.email || "sarah@gmail.com"}
              </p>
            </div>
            <div className="text-right">
              <button className="px-5 py-1.5 rounded-full border border-primary-foreground text-primary-foreground text-xs font-semibold hover:bg-primary-foreground/10 transition-colors">
                Upgrade
              </button>
              <p className="text-muted-foreground text-[10px] mt-1">
                Upgrade for more<br />benefits
              </p>
            </div>
          </div>

          {/* GET SUPPORT Button */}
          <button
            onClick={() => navigate("/support")}
            className="w-full py-3 px-4 rounded-lg bg-card border border-primary-foreground/30 flex items-center justify-between text-primary-foreground text-sm font-semibold tracking-wider hover:bg-primary-foreground/10 transition-colors"
            id="get-support-btn"
          >
            <span>Get Support</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Notifications Row */}
          <button
            onClick={() => navigate("/notifications")}
            className="flex items-center justify-between py-3 border-t border-border"
            id="notifications-btn"
          >
            <div>
              <h3 className="text-foreground font-bold text-base text-left">Notifications</h3>
              <p className="text-muted-foreground text-sm mt-0.5">No new notifications</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Watchlist Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-bold text-base">Watchlist</h3>
              {watchlist.length > 0 && (
                <button 
                  onClick={() => navigate("/profile/watchlist", { state: { title: "Watchlist", items: watchlist } })}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
              {loadingWatchlist ? (
                <div className="flex items-center justify-center h-[175px] w-full text-sm text-muted-foreground">Loading watchlist...</div>
              ) : watchlist.length > 0 ? (
                watchlist.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-[130px] flex flex-col gap-2 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => navigate(`/video/${item.movieId}`)}
                  >
                    <div className="w-[130px] h-[175px] rounded-xl overflow-hidden bg-muted">
                      <img
                        src={item.image || "/assets/poster.png"}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-foreground text-xs font-medium truncate">{item.title}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-[175px] w-full text-sm text-muted-foreground">Your watchlist is empty</div>
              )}
            </div>
          </div>

          {/* Continue Watching Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-bold text-base">Continue Watching</h3>
              {continueWatching.length > 0 && (
                <button 
                  onClick={() => navigate("/profile/watchlist", { state: { title: "Continue Watching", items: continueWatching } })}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
              {loadingContinue ? (
                <div className="flex items-center justify-center h-[100px] w-full text-sm text-muted-foreground">Loading...</div>
              ) : continueWatching.length === 0 ? (
                <div className="flex items-center justify-center h-[100px] w-full text-sm text-muted-foreground">Nothing in progress</div>
              ) : (
                continueWatching.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-[130px] flex flex-col gap-2 cursor-pointer"
                    onClick={() => navigate(`/video/${item.movieId}`)}
                  >
                    <div className="relative w-[130px] h-[100px] rounded-xl overflow-hidden bg-muted">
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                        <div
                          className="h-full bg-destructive rounded-r-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-foreground text-xs font-medium truncate">{item.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quizzes Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-bold text-base">Quiz</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
              {loadingQuizzes ? (
                <div className="flex items-center justify-center h-[100px] w-full text-sm text-muted-foreground">Loading quizzes...</div>
              ) : quizzes.length === 0 ? (
                <div className="flex items-center justify-center h-[100px] w-full text-sm text-muted-foreground">No quizzes available</div>
              ) : (
                quizzes.map((quiz) => {
                  const qCount = quiz.questions?.length ?? 0;
                  return (
                    <div
                      key={quiz.id}
                      className="flex-shrink-0 w-[240px] flex flex-col gap-2 p-3 bg-card border border-border rounded-2xl cursor-pointer hover:border-[#DECB94]/30 hover:bg-white/[0.03] transition-all group"
                      onClick={() => navigate(`/quizzes/${quiz.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#DECB94]/10 flex items-center justify-center border border-[#DECB94]/15">
                          <Trophy className="w-5 h-5 text-[#DECB94]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-foreground font-semibold text-sm truncate group-hover:text-[#DECB94] transition-colors">{quiz.title}</h4>
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block truncate max-w-full">
                            {quiz.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {quiz.duration} mins
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <HelpCircle className="w-3 h-3" />
                          {qCount} Qs
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Delete Account */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 mt-2 hover:opacity-80 transition-opacity"
            id="delete-account-btn"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
            <span className="text-foreground text-sm font-semibold">Delete Account</span>
          </button>

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2 text-center items-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <LogOut className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Log Out</h3>
              <p className="text-sm text-muted-foreground px-2">
                Are you sure you want to log out of your account? You will need to sign in again.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 transition-colors shadow-sm"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-destructive/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2 text-center items-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Delete Account</h3>
              <p className="text-sm text-muted-foreground px-2">
                This action is permanent and cannot be undone. All your data will be wiped out.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl bg-destructive text-white font-semibold hover:bg-destructive/90 transition-colors shadow-sm flex justify-center items-center disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
