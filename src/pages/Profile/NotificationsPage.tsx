import { useState, useEffect } from "react";
import { ArrowLeft, Play, Crown, Trophy, Bell, CheckSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSignedUrl, updateDocument } from "@/Firebase";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { toggleLocalRead, markAllLocalRead } from "@/store/slices/notificationSlice";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "media_upload" | "membership" | "quiz" | "upcoming" | "upcoming_upload";
  image: string;
  read: boolean;
  createdAt: number;
  link?: string;
  category?: string;
}

export const NotificationsPageSkeleton = () => (
  <div className="min-h-screen bg-background flex flex-col w-full animate-pulse">
    {/* Mobile top bar */}
    <div className="md:hidden flex items-center justify-center px-4 pt-4 pb-3 relative min-h-[50px]">
      <Skeleton className="w-8.5 h-8.5 rounded-full absolute left-4 bg-zinc-800" />
      <Skeleton className="h-5 w-32 bg-zinc-800" />
    </div>
    {/* Desktop inline header */}
    <div className="hidden md:flex items-center justify-center px-4 pt-6 pb-3 relative min-h-[60px] w-full">
      <Skeleton className="w-9.5 h-9.5 rounded-xl absolute left-4 bg-zinc-800" />
      <Skeleton className="h-6 w-36 bg-zinc-800" />
    </div>
    <div className="pt-[58px] md:pt-3 max-w-[700px] md:max-w-[1000px] mx-auto w-full px-4 flex items-center gap-2">
      <Skeleton className="h-7.5 w-16 rounded-full bg-zinc-800" />
      <Skeleton className="h-7.5 w-20 rounded-full bg-zinc-800" />
    </div>
    <div className="flex-1 flex flex-col pt-3 max-w-[700px] md:max-w-[1000px] mx-auto w-full px-4 pb-6 gap-4">
       {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-zinc-900" />)}
    </div>
  </div>
);

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const notifications = useSelector((s: RootState) => s.notifications.items);
  const loading = useSelector((s: RootState) => s.notifications.status === "loading");

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [displayCount, setDisplayCount] = useState(10);
  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("avr_read_notifications") || "[]");
    } catch {
      return [];
    }
  });

  const [enrichedImages, setEnrichedImages] = useState<Record<string, string>>({});

  // Fetch signed URLs for storage images asynchronously
  useEffect(() => {
    notifications.forEach(async (n) => {
      if (
        n.image &&
        !n.image.startsWith("http") &&
        !n.image.startsWith("/") &&
        !n.image.startsWith("data:") &&
        !enrichedImages[n.id]
      ) {
        try {
          const signed = await getSignedUrl(n.image);
          setEnrichedImages((prev) => ({ ...prev, [n.id]: signed }));
        } catch (err) {
          console.error("Failed to enrich image path:", n.image, err);
        }
      }
    });
  }, [notifications, enrichedImages]);

  // Relative time formatter matching mockup style
  const formatNotificationTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} hours ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "Yesterday";

    const dateObj = new Date(timestamp);
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayStr = weekdays[dateObj.getDay()];
    const timeStr = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    if (days < 7) {
      return `${dayStr} at ${timeStr}`;
    }

    return dateObj.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleMarkAsRead = async (item: NotificationItem) => {
    if (item.read) {
      if (item.link) navigate(item.link);
      return;
    }

    // Instantly update Redux state (for zero-latency UI update)
    dispatch(toggleLocalRead(item.id));

    if (item.type === "media_upload" || item.type === "upcoming_upload") {
      const updatedReadIds = [...localReadIds, item.id];
      localStorage.setItem("avr_read_notifications", JSON.stringify(updatedReadIds));
      setLocalReadIds(updatedReadIds);
    } else {
      try {
        await updateDocument("notifications", item.id, { read: true });
      } catch (err) {
        console.error("Failed to mark notification as read:", err);
      }
    }

    if (item.link) {
      navigate(item.link);
    }
  };

  const handleToggleRead = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation(); // Prevent card navigation trigger

    // Instantly update Redux state
    dispatch(toggleLocalRead(item.id));

    if (item.type === "media_upload" || item.type === "upcoming_upload") {
      let updatedReadIds;
      if (item.read) {
        updatedReadIds = localReadIds.filter((id) => id !== item.id);
      } else {
        updatedReadIds = [...localReadIds, item.id];
      }
      localStorage.setItem("avr_read_notifications", JSON.stringify(updatedReadIds));
      setLocalReadIds(updatedReadIds);
    } else {
      try {
        await updateDocument("notifications", item.id, { read: !item.read });
      } catch (err) {
        console.error("Failed to toggle read state:", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadItems = notifications.filter((n) => !n.read);
    if (unreadItems.length === 0) return;

    // Instantly update Redux state
    dispatch(markAllLocalRead());

    const mediaUnreadIds = unreadItems
      .filter((n) => n.type === "media_upload" || n.type === "upcoming_upload")
      .map((n) => n.id);

    const firestoreUnreadIds = unreadItems
      .filter((n) => n.type !== "media_upload" && n.type !== "upcoming_upload")
      .map((n) => n.id);

    if (mediaUnreadIds.length > 0) {
      const updatedReadIds = Array.from(new Set([...localReadIds, ...mediaUnreadIds]));
      localStorage.setItem("avr_read_notifications", JSON.stringify(updatedReadIds));
      setLocalReadIds(updatedReadIds);
    }

    if (firestoreUnreadIds.length > 0) {
      try {
        await Promise.all(
          firestoreUnreadIds.map((id) => updateDocument("notifications", id, { read: true }))
        );
      } catch (err) {
        console.error("Failed to mark all as read:", err);
      }
    }
  };

  const renderSubIcon = (type: string) => {
    switch (type) {
      case "media_upload":
        return (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-secondary flex items-center justify-center border-2 border-background shadow-md">
            <Play className="w-2.5 h-2.5 fill-secondary text-secondary" />
          </div>
        );
      case "upcoming":
      case "upcoming_upload":
        return (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-secondary flex items-center justify-center border-2 border-background shadow-md">
            <Bell className="w-2.5 h-2.5 text-secondary fill-current animate-pulse" />
          </div>
        );
      case "membership":
        return (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-secondary flex items-center justify-center border-2 border-background shadow-md">
            <Crown className="w-2.5 h-2.5 fill-current text-secondary" />
          </div>
        );
      case "quiz":
        return (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-secondary flex items-center justify-center border-2 border-background shadow-md">
            <Trophy className="w-2.5 h-2.5 text-secondary fill-current" />
          </div>
        );
      default:
        return null;
    }
  };

  const renderDescription = (item: NotificationItem) => {
    if (item.type === "media_upload") {
      return (
        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
          <span className="font-semibold text-foreground">AVR Cinema</span> uploaded new content in{" "}
          <span className="font-semibold text-primary">{item.category}</span>. Watch{" "}
          <span className="font-semibold text-foreground">"{item.title}"</span> now streaming in HD.
        </p>
      );
    }
    if (item.type === "upcoming" || item.type === "upcoming_upload") {
      return (
        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
          <span className="font-semibold text-primary">Upcoming Upload</span>. Get ready for{" "}
          <span className="font-semibold text-foreground">"{item.title}"</span> in{" "}
          <span className="font-semibold text-primary">{item.category || "AVR Cinema"}</span>. Watch the trailer now!
        </p>
      );
    }
    if (item.type === "membership") {
      const planNameMatch = item.description.match(/subscribed to the (.*?) plan/);
      const planNameUpgradeMatch = item.description.match(/upgraded to the (.*?) plan/);
      const planName = planNameMatch ? planNameMatch[1] : (planNameUpgradeMatch ? planNameUpgradeMatch[1] : "Premium");

      return (
        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
          <span className="font-semibold text-foreground">Membership Plan</span> upgraded/renewed. You successfully subscribed to the{" "}
          <span className="font-semibold text-primary">{planName}</span> plan.
        </p>
      );
    }
    if (item.type === "quiz") {
      const scoreMatch = item.description.match(/score of (.*?)\%/);
      const quizNameMatch = item.description.match(/completed the "(.*?)" quiz/);
      const score = scoreMatch ? scoreMatch[1] : "100";
      const quizName = quizNameMatch ? quizNameMatch[1] : "Trivia";

      return (
        <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
          <span className="font-semibold text-foreground">Quiz Completed</span> challenge in{" "}
          <span className="font-semibold text-primary">{quizName}</span>. You scored a massive{" "}
          <span className="font-semibold text-primary">{score}%</span>!
        </p>
      );
    }
    return <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{item.description}</p>;
  };

  // Group notifications into New and Earlier
  const isItemNew = (item: NotificationItem) =>
    !item.read || Date.now() - item.createdAt < 24 * 60 * 60 * 1000;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "unread") return !item.read;
    return true;
  });

  // Balanced lazy loading slicing
  const displayedNotifications = filteredNotifications.slice(0, displayCount);

  const newItems = displayedNotifications.filter(isItemNew);
  const earlierItems = displayedNotifications.filter((item) => !isItemNew(item));

  const NotificationsSkeleton = () => (
    <div className="space-y-3 mt-1 w-full animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border border-border/40 outline-none">
          <CardContent className="p-3.5 md:p-4 flex gap-3.5 items-start relative">
            {/* Avatar + Sub-icon badge */}
            <div className="relative shrink-0 mt-0.5">
              <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-800" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background bg-zinc-700" />
            </div>
            
            {/* Content area */}
            <div className="flex-1 min-w-0 pr-6 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-1/2 md:w-1/3 bg-zinc-800 rounded" />
                <Skeleton className="h-3 w-16 bg-zinc-800 rounded mt-1 shrink-0" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full bg-zinc-800/60 rounded" />
                <Skeleton className="h-3.5 w-5/6 bg-zinc-800/60 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header (Centered heading with tight padding) */}
      <div className="fixed md:static top-0 left-0 right-0 z-50 bg-background border-b border-border md:border-none">
        <div className="max-w-[700px] md:max-w-[1000px] mx-auto w-full">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-center px-4 pt-4 pb-3 relative min-h-[50px]">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="focusable w-8.5 h-8.5 rounded-full border-border absolute left-4"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <h1 className="text-foreground font-bold text-base">Notifications</h1>
          </div>

          {/* Desktop inline header */}
          <div className="hidden md:flex items-center justify-center px-4 pt-6 pb-3 relative min-h-[60px] w-full">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="focusable w-9.5 h-9.5 rounded-xl border-border absolute left-4"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (Tightened vertical spacing) */}
      <div className="pt-[58px] md:pt-3 max-w-[700px] md:max-w-[1000px] mx-auto w-full px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={`focusable rounded-full text-xs font-semibold px-4 h-7.5 transition-colors ${filter === "all" ? "bg-primary text-secondary hover:bg-primary/90" : "border-border text-foreground hover:bg-muted/50"
              }`}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className={`focusable rounded-full text-xs font-semibold px-4 h-7.5 transition-colors ${filter === "unread" ? "bg-primary text-secondary hover:bg-primary/90" : "border-border text-foreground hover:bg-muted/50"
              }`}
          >
            Unread
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary text-background text-[9px] font-black">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </Button>
        </div>

        {notifications.some((n) => !n.read) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="focusable text-xs text-primary hover:text-primary/80 flex items-center gap-1 h-7.5 px-2 rounded-lg hover:bg-primary/10"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification List container (Tightened spacing and card padding) */}
      <div className="flex-1 flex flex-col pt-3 max-w-[700px] md:max-w-[1000px] mx-auto w-full px-4 pb-6">
        {loading ? (
          <NotificationsSkeleton />
        ) : filteredNotifications.length === 0 ? (
          <Empty className="py-20 border border-dashed border-border/40 bg-card/25 rounded-2xl">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-primary text-secondary">
                <Bell className="w-5 h-5 text-secondary" />
              </EmptyMedia>
              <EmptyTitle className="text-foreground font-semibold">No notifications yet</EmptyTitle>
              <EmptyDescription className="text-muted-foreground max-w-[280px] mx-auto text-xs">
                {filter === "unread"
                  ? "You've read all your notifications!"
                  : "When you take quizzes, buy subscriptions, or new content is uploaded, notifications will show up here."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            {/* New Notifications */}
            {newItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 py-0.5">
                  <h2 className="text-foreground font-bold text-sm">New</h2>
                  <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                    {newItems.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {newItems.map((item) => (
                    <Card
                      key={item.id}
                      onClick={() => handleMarkAsRead(item)}
                      className={`focusable transition-all py-1 duration-200 border border-border/45 hover:border-primary/25 bg-card/40 hover:bg-card/70 cursor-pointer relative overflow-hidden outline-none ${!item.read ? "border-l-[3px] border-l-primary" : ""
                        }`}
                    >
                      <CardContent className="px-3.5 flex items-start gap-3.5">
                        {/* Avatar container */}
                        <div className="relative shrink-0 mt-0.5">
                          <img
                            src={enrichedImages[item.id] || item.image}
                            alt={item.title}
                            className="w-13 h-13 rounded-full object-cover border border-border/50"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = "/assets/poster.png";
                            }}
                          />
                          {renderSubIcon(item.type)}
                        </div>

                        {/* Content block */}
                        <div className="flex-1 min-w-0 pr-3">
                          {renderDescription(item)}
                          <p className="text-muted-foreground text-[10px] mt-1 font-medium">
                            {formatNotificationTime(item.createdAt)}
                          </p>
                        </div>

                        {/* Interactive toggle unread/read indicators */}
                        <div className="shrink-0 self-center flex items-center gap-2">
                          <button className="focusable"
                            onClick={(e) => handleToggleRead(e, item)}
                            className="focusable w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-colors outline-none"
                            title={item.read ? "Mark as unread" : "Mark as read"}
                          >
                            {!item.read ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-primary block shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                            ) : (
                              <span className="w-2 h-2 rounded-full border border-muted-foreground/40 block" />
                            )}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Earlier Notifications */}
            {earlierItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 py-0.5">
                  <h2 className="text-foreground font-bold text-sm">Earlier</h2>
                  <span className="flex items-center justify-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                    {earlierItems.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {earlierItems.map((item) => (
                    <Card
                      key={item.id}
                      onClick={() => handleMarkAsRead(item)}
                      className="focusable transition-all duration-200 border border-border/45 hover:border-primary/25 bg-card/20 hover:bg-card/45 cursor-pointer relative overflow-hidden outline-none py-1"
                    >
                      <CardContent className="p-3.5 flex items-start gap-3.5">
                        {/* Avatar container */}
                        <div className="relative shrink-0 mt-0.5">
                          <img
                            src={enrichedImages[item.id] || item.image}
                            alt={item.title}
                            className="w-13 h-13 rounded-full object-cover border border-border/50"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.src = "/assets/poster.png";
                            }}
                          />
                          {renderSubIcon(item.type)}
                        </div>

                        {/* Content block */}
                        <div className="flex-1 min-w-0 ">
                          {renderDescription(item)}
                          <p className="text-muted-foreground text-[10px] mt-1 font-medium">
                            {formatNotificationTime(item.createdAt)}
                          </p>
                        </div>

                        {/* Interactive toggle unread/read indicators */}
                        {/* <div className="shrink-0 self-center flex items-center gap-2">
                          <button className="focusable"
                            onClick={(e) => handleToggleRead(e, item)}
                            className="focusable w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary-foreground transition-colors outline-none"
                            title={item.read ? "Mark as unread" : "Mark as read"}
                          >
                            {!item.read ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-primary-foreground block shadow-[0_0_8px_rgba(222,203,148,0.7)]" />
                            ) : (
                              <span className="w-2 h-2 rounded-full border border-muted-foreground/40 block" />
                            )}
                          </button>
                        </div> */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Load More Button for balanced lazy loading */}
            {filteredNotifications.length > displayCount && (
              <div className="flex justify-center ">
                <Button
                  variant="outline"
                  onClick={() => setDisplayCount((prev) => prev + 10)}
                  className="focusable text-xs font-semibold border border-none  ring-transparent"
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
