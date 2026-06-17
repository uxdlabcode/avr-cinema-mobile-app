import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
interface NotificationItem {
  id: number;
  title: string;
  description: string;
  time: string;
  image: string;
  badge: number | null;
  read: boolean;
}

const notifications: NotificationItem[] = [];
const recommended: NotificationItem[] = [];
export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"general" | "recommended">("general");

  const items = activeTab === "general" ? notifications : recommended;
  const unreadCount = recommended.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header & Tabs (Fixed on mobile) ── */}
      <div className="fixed md:static top-0 left-0 right-0 z-50 bg-background border-b border-border md:border-none">
        <div className="max-w-[700px] md:max-w-[1000px] mx-auto w-full">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 px-4 pt-5 pb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="focusable w-9 h-9 rounded-full border-border"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <h1 className="text-foreground font-bold text-lg">Notifications</h1>
          </div>

          {/* Desktop inline header */}
          <div className="hidden md:flex items-center gap-3 px-4 pt-8 pb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/profile")}
              className="focusable w-10 h-10 rounded-xl border-border"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          </div>

          <div className="flex items-center gap-6 px-4 pb-3 border-b border-border md:border-b-2">
            <Button
              variant="ghost"
              onClick={() => setActiveTab("general")}
              className={`focusable pb-2 h-auto rounded-none text-sm font-semibold transition-colors border-b-2 hover:bg-transparent ${activeTab === "general"
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
            >
              General
            </Button>
            <Button
              variant="ghost"
              onClick={() => setActiveTab("recommended")}
              className={`focusable pb-2 h-auto rounded-none text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 hover:bg-transparent ${activeTab === "recommended"
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
            >
              Recommended
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Notification List ── */}
      <div className="flex flex-col divide-y divide-border pt-[140px] md:pt-4 max-w-[700px] md:max-w-[1000px] mx-auto w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/50 cursor-pointer ${!item.read ? "bg-muted/30" : ""
                }`}
            >
              {/* Image with badge */}
              <div className="relative shrink-0">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-14 h-14 rounded-full object-cover"
                />
                {item.badge && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center border-2 border-background">
                    {item.badge}
                  </span>
                )}
                {/* Unread dot */}
                {!item.read && !item.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-bold text-sm uppercase tracking-wide leading-tight">
                  {item.title}
                </p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Time */}
              <p className="shrink-0 text-muted-foreground text-[11px] mt-0.5 whitespace-nowrap">
                {item.time}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
