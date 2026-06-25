import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import {
  Home,
  Tv,
  Search,
  Film,
  User,
  Crown,
  Bell
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Dock, DockIcon } from "@/components/ui/dock";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export function Navbar() {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const mobileNavItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Tv, label: "TV", path: "/tv" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Film, label: "Movie", path: "/movies" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const desktopNavItems = [
    { label: "Home", path: "/dashboard" },
    { label: "TV", path: "/tv" },
    { label: "Movies", path: "/movies" },

    { label: "Quiz", path: "/quiz" },
    { label: "Trailers", path: "/trailers" },
    { label: "Notifications", path: "/notifications" },
  ];

  const getActiveTab = () => {
    const mainPaths = [
      "/dashboard",
      "/tv",
      "/movies",
      "/search",
      "/profile",
      "/quiz",
      "/trailers",
      "/notifications"
    ];
    const currentPath = location.pathname;

    if (currentPath.startsWith("/profile") || currentPath.startsWith("/update-profile") || currentPath.startsWith("/support")) {
      localStorage.setItem("avr_active_tab", "/profile");
      return "/profile";
    }
    if (currentPath === "/quizzes" || currentPath.startsWith("/quizzes/")) {
      localStorage.setItem("avr_active_tab", "/quiz");
      return "/quiz";
    }

    if (mainPaths.includes(currentPath)) {
      localStorage.setItem("avr_active_tab", currentPath);
      return currentPath;
    }

    const stored = localStorage.getItem("avr_active_tab");
    if (stored && mainPaths.includes(stored)) {
      return stored;
    }

    return "/dashboard";
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const activeTab = getActiveTab();
  const activeIndex = mobileNavItems.findIndex(
    (item) => activeTab === item.path || (activeTab === "/notifications" && item.path === "/profile")
  );
  // console.log("NAVBAR DEBUG:", { pathname: location.pathname, activeTab, activeIndex });

  return (
    <>
      {/* Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between h-[70px] px-4 lg:px-8 xl:px-12 bg-black/90 backdrop-blur-sm border-b border-zinc-800/50 sticky top-0 z-50 transition-all relative">
        <div className="flex-1 flex justify-start min-w-[120px]">
          <Link to="/dashboard" className="focusable flex items-center gap-2">
            <img src="/assets/headerLogo.png" alt="AV Logo" className="h-6 md:h-14 object-contain" />
          </Link>
        </div>

        <nav className="flex-initial flex items-center justify-center gap-3 lg:gap-5 xl:gap-6 overflow-hidden">
          {desktopNavItems.map((item) => {
            let visibilityClass = "inline-block";
            if (item.label === "Notifications") {
              visibilityClass = "hidden xl:inline-block";
            } else if (item.label === "Quiz" || item.label === "Trailers") {
              visibilityClass = "hidden lg:inline-block";
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`focusable text-sm font-medium hover:text-white transition-colors whitespace-nowrap ${visibilityClass} ${
                  activeTab === item.path ? "text-white font-semibold" : "text-gray-400"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 flex justify-end items-center gap-3 lg:gap-5 xl:gap-6 min-w-[150px]">
          {/* Subscribe Button hidden for now */}
          {/* <Button
            onClick={() => navigate("/upgrade-plan")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-2 text-sm font-semibold rounded-md h-9 px-3 lg:px-4 cursor-pointer shrink-0"
          >
            <Crown className="w-4 h-4 text-white" />
            Subscribe
          </Button> */}

          <button 
            onClick={() => navigate("/search")}
            className="focusable p-2 hover:bg-zinc-800/60 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button 
            onClick={() => navigate("/notifications")}
            className="focusable p-2 hover:bg-zinc-800/60 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          <Link className="focusable shrink-0" to="/profile">
            <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-white transition-all cursor-pointer">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-zinc-800 text-sm font-medium text-white">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      {/* Bottom screen blur fade */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 h-8 z-40 pointer-events-none backdrop-blur-md bg-black/90"
        style={{
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)"
        }}
      />
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex justify-center">
        <Dock className="relative w-full max-w-sm bg-black/40 border border-zinc-800/50 backdrop-blur-lg px-2 mx-0 shadow-2xl h-14 gap-1">
          {activeIndex !== -1 && (
            <motion.div
              className="absolute inset-y-1 dark:bg-primary/20 bg-primary/10 rounded-3xl -z-10 pointer-events-none"
              initial={false}
              animate={{
                x: `${activeIndex * 100}%`,
              }}
              style={{
                left: "8px",
                width: "calc((100% - 16px) / 5)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
          )}
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.path || (activeTab === "/notifications" && item.path === "/profile");
            return (
              <DockIcon
                key={item.label}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center transition-all cursor-pointer gap-1 h-12",
                  isActive
                    ? "text-primary"
                    : "text-primary/80  hover:text-primary"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-transform font-semibold z-10", isActive && "scale-110")} />
                <span className="text-[10px]  z-10">{item.label}</span>
              </DockIcon>
            );
          })}
        </Dock>
      </div>
    </>
  );
}
