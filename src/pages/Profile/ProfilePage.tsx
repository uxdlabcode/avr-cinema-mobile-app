import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { LogOut, Trash2, Pencil, ChevronDown, ChevronRight, Trophy, HelpCircle, Clock, Crown, Bell, Bookmark, Play, Shield, HeadphonesIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLogout } from "@/Firebase/FirebaseAuth/UserLogOut";
import { deleteUserData } from "@/Firebase/FirebaseAuth/DeleteUser";
import { useNavigate } from "react-router-dom";
import LogoImage from "@/assets/Media (3) 1.png";
import { db } from "@/Firebase/firebase";
import { getSignedUrl } from "@/Firebase";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { getCollectionData } from "@/Firebase/CloudFirestore/GetData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const [currentPlanName, setCurrentPlanName] = useState("Free Plan");

  useEffect(() => {
    if (!user?.membershipPlanId) {
      setCurrentPlanName("Free Plan");
      return;
    }
    const fetchPlan = async () => {
      try {
        const planDoc = await getDoc(doc(db, "plans", user.membershipPlanId as string));
        if (planDoc.exists()) {
          setCurrentPlanName(planDoc.data().name || "Premium Plan");
        } else {
          setCurrentPlanName("Premium Plan");
        }
      } catch (err) {
        console.error("Error fetching plan:", err);
      }
    };
    fetchPlan();
  }, [user?.membershipPlanId]);

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
            } catch {/* ignore */ }
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

  // ─── Desktop Sidebar Card ───
  const DesktopSidebar = () => (
    <div className="hidden md:flex flex-col gap-5 w-[320px] lg:w-[360px] shrink-0 sticky top-[90px] self-start">

      {/* User Profile Card */}
      <Card className="p-6 flex flex-col items-center gap-4 relative overflow-hidden rounded-lg">
        {/* Decorative top gradient */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-primary/10 to-transparent" />

        <div className="relative z-10 flex flex-col items-center gap-3">
          <Avatar className="w-20 h-20 ring-3 ring-primary/30 shadow-xl">
            <AvatarImage src={user?.avatar || ""} className="object-cover" />
            <AvatarFallback className="bg-muted text-foreground text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="text-foreground font-bold text-lg">{name}</p>
            <p className="text-muted-foreground text-sm">{user?.email || "sarah@gmail.com"}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/update-profile")}
            className="rounded-xl flex items-center gap-2 px-4 py-2 bg-muted text-foreground hover:bg-muted/80"
            id="edit-profile-btn-desktop"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </Button>
        </div>

        {/* Membership Badge */}
        <div className="w-full border-t border-border pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-sm">{currentPlanName}</p>
              <p className="text-muted-foreground text-xs">Current Plan</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/upgrade-plan")}
            id="upgrade-btn-desktop"
            className="rounded-full border-primary text-primary-foreground hover:bg-primary-foreground h-8 px-4 text-xs"
          >
            Upgrade
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="rounded-lg overflow-hidden p-0 gap-0">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-foreground font-semibold text-sm">Quick Actions</p>
        </div>
        <div className="flex flex-col">
          <Button
            variant="ghost"
            onClick={() => navigate("/support")}
            className="w-full justify-start gap-3 px-5 py-3.5 h-auto text-left group rounded-none"
            id="get-support-btn-desktop"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <HeadphonesIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">Get Support</p>
              <p className="text-muted-foreground text-xs">Help center & tickets</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/notifications")}
            className="hidden w-full justify-start gap-3 px-5 py-3.5 h-auto text-left group rounded-none"
            id="notifications-btn-desktop"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">Notifications</p>
              <p className="text-muted-foreground text-xs">No new notifications</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowLogoutModal(true)}
            className="w-full justify-start gap-3 px-5 py-3.5 h-auto text-left group rounded-none hover:bg-destructive/5"
            id="logout-btn-desktop"
          >
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-destructive font-medium text-sm">Log Out</p>
              <p className="text-muted-foreground text-xs">Sign out of your account</p>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );

  // ─── Desktop Content Cards ───
  const DesktopContent = () => (
    <div className="hidden md:flex flex-col gap-6 flex-1 min-w-0">

      {/* Watchlist Card */}
      <Card className="rounded-lg overflow-hidden p-0 gap-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bookmark className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-foreground font-bold text-base">Watchlist</h3>
            {watchlist.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {watchlist.length} items
              </span>
            )}
          </div>
          {watchlist.length > 0 && (
            <Button
              variant="link"
              onClick={() => navigate("/profile/watchlist", { state: { title: "Watchlist", items: watchlist } })}
              className="text-primary p-0 h-auto gap-1 font-medium hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {loadingWatchlist ? (
              <div className="col-span-full flex items-center justify-center h-[200px] text-sm text-muted-foreground">Loading watchlist...</div>
            ) : watchlist.length > 0 ? (
              watchlist.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 cursor-pointer group"
                  onClick={() => navigate(`/video/${item.movieId}`)}
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-muted relative">
                    <img
                      src={item.image || "/assets/poster.png"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                  <p className="text-foreground text-sm font-medium truncate">{item.title}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
                <Bookmark className="w-8 h-8 opacity-40" />
                <p className="text-sm">Your watchlist is empty</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Continue Watching Card */}
      <Card className="rounded-lg overflow-hidden p-0 gap-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-foreground font-bold text-base">Continue Watching</h3>
            {continueWatching.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {continueWatching.length} items
              </span>
            )}
          </div>
          {continueWatching.length > 0 && (
            <Button
              variant="link"
              onClick={() => navigate("/profile/watchlist", { state: { title: "Continue Watching", items: continueWatching } })}
              className="text-primary p-0 h-auto gap-1 font-medium hover:underline"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {loadingContinue ? (
              <div className="col-span-full flex items-center justify-center h-[140px] text-sm text-muted-foreground">Loading...</div>
            ) : continueWatching.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-[140px] text-muted-foreground gap-2">
                <Play className="w-8 h-8 opacity-40" />
                <p className="text-sm">Nothing in progress</p>
              </div>
            ) : (
              continueWatching.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 cursor-pointer group"
                  onClick={() => navigate(`/video/${item.movieId}`)}
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-destructive rounded-r-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-foreground text-sm font-medium truncate">{item.title}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Quizzes Card */}
      <Card className="rounded-lg overflow-hidden p-0 gap-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-foreground font-bold text-base">Quizzes</h3>
            {quizzes.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {quizzes.length} available
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {loadingQuizzes ? (
              <div className="col-span-full flex items-center justify-center h-32 text-sm text-muted-foreground">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <Trophy className="w-8 h-8 opacity-40" />
                <p className="text-sm">No quizzes available</p>
              </div>
            ) : (
              quizzes.map((quiz) => {
                const qCount = quiz.questions?.length ?? 0;
                return (
                  <div
                    key={quiz.id}
                    className="flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-xl cursor-pointer hover:border-primary/30 hover:bg-muted/50 transition-all group"
                    onClick={() => navigate(`/quizzes/${quiz.id}`)}
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15">
                      <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-foreground font-semibold text-sm truncate group-hover:text-primary transition-colors">{quiz.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate max-w-[120px]">
                          {quiz.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {quiz.duration} mins
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <HelpCircle className="w-3 h-3" />
                          {qCount} Qs
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {/* Account Section - Desktop */}
      <Card className="rounded-lg overflow-hidden p-0 gap-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="text-foreground font-bold text-base">Account</h3>
          </div>
        </div>
        <div className="p-6">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="w-full justify-start gap-4 p-4 h-auto rounded-lg text-left group border-border hover:bg-muted/50"
            id="delete-account-btn-desktop-content"
          >
            <div className="shrink-0 w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center border border-border group-hover:bg-foreground/10 transition-colors">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-foreground font-semibold text-sm">Delete Account</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and data</p>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background">

        {/* ═══════════ DESKTOP LAYOUT ═══════════ */}
        <div className="hidden md:flex gap-6 lg:gap-8 px-6 lg:px-10 xl:px-16 pt-8 pb-16 max-w-7xl mx-auto w-full">
          <DesktopSidebar />
          <DesktopContent />
        </div>

        {/* ═══════════ MOBILE LAYOUT (unchanged) ═══════════ */}
        <div className="md:hidden flex flex-col gap-5 px-4 pt-[72px] pb-7">

          {/* Top Bar — Logo + Logout */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-background pt-6 pb-3 flex items-center justify-between px-4">
            <img src={LogoImage} alt="AVR Cinema" className="h-10 w-auto object-contain" />
            <Button
              variant="ghost"
              onClick={() => setShowLogoutModal(true)}
              className="text-destructive hover:text-destructive hover:bg-transparent hover:opacity-80 p-0 h-auto gap-1.5 font-semibold text-sm"
              id="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>

          {/* User Info Card */}
          <Card className="flex items-center gap-4 p-4 rounded-2xl p-4 gap-4 flex-row">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/update-profile")}
              className="w-8 h-8 rounded-full hover:bg-muted"
              id="edit-profile-btn"
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </Button>
          </Card>

          {/* Tier + Upgrade Row */}
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" className="text-primary text-left !p-0 flex justify-start h-auto hover:bg-transparent gap-1 font-semibold text-sm">
                {currentPlanName} <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              <p className="text-muted-foreground text-xs mt-0.5">
                {user?.email || ""}
              </p>
            </div>
            <div className="text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/upgrade-plan")}
                id="upgrade-btn"
                className="rounded-full border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 px-5 h-8 text-xs font-semibold"
              >
                Upgrade
              </Button>
              <p className="text-muted-foreground text-[10px] mt-1">
                Upgrade for more<br />benefits
              </p>
            </div>
          </div>

          {/* GET SUPPORT Button */}
          <Button
            variant="outline"
            onClick={() => navigate("/support")}
            className="w-full justify-between py-3 px-4 h-auto rounded-lg border-primary/30 text-primary hover:text-primary hover:bg-primary/10 tracking-wider font-semibold text-sm"
            id="get-support-btn"
          >
            <span>Get Support</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Notifications Row */}
          <Button
            variant="ghost"
            onClick={() => navigate("/notifications")}
            className="hidden w-full justify-between py-3 h-auto rounded-none border-t border-border hover:bg-transparent text-left"
            id="notifications-btn"
          >
            <div>
              <h3 className="text-foreground font-bold text-base text-left">Notifications</h3>
              <p className="text-muted-foreground text-sm mt-0.5">No new notifications</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* Watchlist Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-bold text-base">Watchlist</h3>
              {watchlist.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/profile/watchlist", { state: { title: "Watchlist", items: watchlist } })}
                  className="w-8 h-8 rounded-full"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Button>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/profile/watchlist", { state: { title: "Continue Watching", items: continueWatching } })}
                  className="w-8 h-8 rounded-full"
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Button>
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
                    <Card
                      key={quiz.id}
                      className="flex-shrink-0 w-[240px] flex flex-col gap-2 p-3 rounded-2xl cursor-pointer hover:border-primary/30 hover:bg-white/[0.03] transition-all group"
                      onClick={() => navigate(`/quizzes/${quiz.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/15">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-foreground font-semibold text-sm truncate group-hover:text-primary transition-colors">{quiz.title}</h4>
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
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Account Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-bold text-base">Account</h3>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="w-full justify-start gap-3 p-3 h-auto rounded-lg border-border hover:bg-muted/50 text-left group"
                id="delete-account-btn"
              >
                <div className="shrink-0 w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center border border-border group-hover:bg-foreground/10 transition-colors">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-foreground font-semibold text-sm">Delete Account</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Permanently remove your account and data</p>
                </div>
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
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
              <Button
                variant="outline"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-auto py-3 rounded-xl border-border hover:bg-muted font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                className="flex-1 h-auto py-3 rounded-xl shadow-sm hover:bg-destructive/90 font-semibold"
              >
                Yes, Log Out
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="border-destructive/30 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
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
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 h-auto py-3 rounded-xl border-border hover:bg-muted font-semibold disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 h-auto py-3 rounded-xl shadow-sm hover:bg-destructive/90 font-semibold disabled:opacity-50 flex justify-center items-center"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};
