import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const notifications = [
  {
    id: 1,
    title: "Sale is Live",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit dolor sit amet, consectetur adipiscing elit.",
    time: "1m ago",
    image: "/assets/episode1.webp",
    badge: 1,
    read: false,
  },
  {
    id: 2,
    title: "Sale is Live",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit dolor sit amet, consectetur adipiscing elit.",
    time: "1m ago",
    image: "/assets/episode2.webp",
    badge: 2,
    read: false,
  },
  {
    id: 3,
    title: "Sale is Live",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit dolor sit amet, consectetur adipiscing elit.",
    time: "1m ago",
    image: "/assets/poster.png",
    badge: null,
    read: true,
  },
  {
    id: 4,
    title: "Sale is Live",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit dolor sit amet, consectetur adipiscing elit.",
    time: "10 Hrs ago",
    image: "/assets/episode1.webp",
    badge: null,
    read: true,
  },
  {
    id: 5,
    title: "Sale is Live",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit dolor sit amet, consectetur adipiscing elit.",
    time: "15 Hrs ago",
    image: "/assets/episode2.webp",
    badge: null,
    read: true,
  },
];

const recommended = [
  {
    id: 6,
    title: "New Release",
    description: "Lord of the Rings is now available on AVR Cinema. Watch it now!",
    time: "2m ago",
    image: "/assets/episode2.webp",
    badge: null,
    read: false,
  },
  {
    id: 7,
    title: "Top Pick for You",
    description: "Based on your watchlist, you might enjoy Anweshippin Kandethum.",
    time: "5 Hrs ago",
    image: "/assets/poster.png",
    badge: null,
    read: true,
  },
];

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"general" | "recommended">("general");

  const items = activeTab === "general" ? notifications : recommended;
  const unreadCount = recommended.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Header & Tabs (Fixed) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background">
        <div className="max-w-[700px] mx-auto w-full">
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button
            onClick={() => navigate("/profile")}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-white font-bold text-lg">Notifications</h1>
        </div>

        <div className="flex items-center gap-6 px-4 pb-3 border-b border-white/10">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "general"
                ? "text-white border-white"
                : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("recommended")}
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === "recommended"
                ? "text-white border-white"
                : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
          >
            Recommended
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        </div>
      </div>

      {/* ── Notification List ── */}
      <div className="flex flex-col divide-y divide-white/5 pt-32 max-w-[700px] mx-auto w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-4 transition-colors hover:bg-white/5 cursor-pointer ${!item.read ? "bg-white/[0.03]" : ""
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
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center border-2 border-[#0d0d0d]">
                    {item.badge}
                  </span>
                )}
                {/* Unread dot */}
                {!item.read && !item.badge && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-yellow-400 border-2 border-[#0d0d0d]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm uppercase tracking-wide leading-tight">
                  {item.title}
                </p>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Time */}
              <p className="shrink-0 text-gray-500 text-[11px] mt-0.5 whitespace-nowrap">
                {item.time}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
