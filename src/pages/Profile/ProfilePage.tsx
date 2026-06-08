import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { LogOut, Trash2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogout } from "@/Firebase/FirebaseAuth/UserLogOut";
import { deleteUserData } from "@/Firebase/FirebaseAuth/DeleteUser";
import { useNavigate } from "react-router-dom";
import LogoImage from "@/assets/Media (3) 1.png";
import { db } from "@/Firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const continueWatchingItems = [
  { id: 1, title: "The Office", poster: "/assets/episode1.webp", progress: 42, timeLeft: "42m" },
  { id: 2, title: "The Office", poster: "/assets/episode2.webp", progress: 35, timeLeft: "38m" },
  { id: 3, title: "Breaking Bad", poster: "/assets/poster.png", progress: 70, timeLeft: "22m" },
];

export const ProfilePage = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const logout = useLogout();
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoadingWatchlist(false);
      return;
    }

    const fetchWatchlist = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "my_list"));
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setWatchlist(items);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
      } finally {
        setLoadingWatchlist(false);
      }
    };

    fetchWatchlist();
  }, [user?.id]);

  const name = user?.name || "Super Admin";
  const initials = name
    .split(" ")
    .map((n) => n[0])
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
            <h3 className="text-foreground font-bold text-base">Watchlist</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
              {loadingWatchlist ? (
                <div className="flex items-center justify-center h-[175px] w-full text-sm text-muted-foreground">Loading watchlist...</div>
              ) : watchlist.length > 0 ? (
                watchlist.map((item) => (
                  <div key={item.id} className="flex-shrink-0 w-[130px] flex flex-col gap-2 cursor-pointer hover:opacity-90 transition-opacity">
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
            <h3 className="text-foreground font-bold text-base">Continue Watching</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
              {continueWatchingItems.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-[130px] flex flex-col gap-2">
                  <div className="relative w-[130px] h-[100px] rounded-xl overflow-hidden bg-muted">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Time remaining badge */}
                    <div className="absolute bottom-2 right-2 bg-secondary/70 backdrop-blur-sm text-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      {item.timeLeft}
                    </div>
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
              ))}
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
