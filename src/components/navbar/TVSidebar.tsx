import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Tv,
  Film,
  Search,
  User,
  Trophy,
  PlayCircle,
  Crown
} from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export function TVSidebar() {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const tvNavItems = [
    { label: "Home", path: "/dashboard", icon: Home },
    { label: "TV Shows", path: "/tv", icon: Tv },
    { label: "Movies", path: "/movies", icon: Film },
    { label: "Trailers", path: "/trailers", icon: PlayCircle },
    { label: "Quizzes", path: "/quiz", icon: Trophy },
    { label: "Search", path: "/search", icon: Search },
    { label: "Profile", path: "/profile", icon: User },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 h-screen bg-zinc-950/95 border-r border-zinc-800/60 z-50 transition-all duration-300 flex flex-col items-start pt-6 pb-8 ${
        isExpanded ? "w-[240px] px-4" : "w-[80px] px-2"
      }`}
      onFocus={() => setIsExpanded(true)}
      onBlur={(e) => {
        // Only collapse if the new focus target is not inside the sidebar
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsExpanded(false);
        }
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* App Logo */}
      <div className="w-full flex items-center justify-center mb-10 overflow-hidden h-14">
        {isExpanded ? (
          <img
            src="/assets/headerLogo.png"
            alt="AVR Logo"
            className="h-12 object-contain transition-all duration-300"
          />
        ) : (
          <div className="w-10 h-10 bg-[#DECB94] rounded-full flex items-center justify-center font-bold text-black text-lg shadow-md">
            AVR
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 w-full space-y-3 flex flex-col">
        {tvNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={`focusable flex items-center gap-4 py-3.5 px-3 rounded-lg transition-all duration-200 w-full outline-none border border-transparent
                ${
                  isActive
                    ? "bg-[#DECB94]/10 text-[#DECB94]"
                    : "text-zinc-400 hover:text-zinc-200"
                }
                focus:bg-zinc-800 focus:text-white focus:border-zinc-700 focus:scale-105
              `}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-[#DECB94]" : ""}`} />
              <span
                className={`text-sm font-medium transition-opacity duration-200 whitespace-nowrap ${
                  isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Profile/Subscription status at the bottom */}
      <div className="w-full border-t border-zinc-800/50 pt-4 flex flex-col items-center">
        {user?.membershipStatus === "active" && (
          <Link
            to="/membership"
            className="focusable mb-4 p-2 rounded-full focus:bg-zinc-800 focus:scale-105 border border-transparent focus:border-zinc-700 outline-none text-[#DECB94]"
            title="Premium Active"
          >
            <Crown className="w-5 h-5" />
          </Link>
        )}
        <div className="flex items-center gap-3 w-full px-3 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shadow">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-medium text-zinc-300 truncate">
                {user?.name || "Guest User"}
              </span>
              <span className="text-[10px] text-zinc-500 truncate">
                {user?.membershipStatus === "active" ? "Premium Subscriber" : "Free Plan"}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
