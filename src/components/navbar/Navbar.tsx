import { Link, useLocation, useNavigate } from "react-router-dom";
import React, { useState } from "react";
import {
  Home,
  Tv,
  Search,
  Film,
  User,
  Crown
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
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between h-[70px] px-6 lg:px-12 bg-black/90 backdrop-blur-sm border-b border-zinc-800/50 sticky top-0 z-50 transition-all relative">
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/assets/headerLogo.png" alt="AVR Logo" className="h-6 md:h-14 object-contain" />
          </Link>
        </div>

        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 lg:gap-6">
          {desktopNavItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              className={`text-sm font-medium hover:text-white transition-colors ${location.pathname === item.path ? 'text-white font-semibold' : 'text-gray-400'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 lg:gap-6">
          <Button
            onClick={() => navigate("/upgrade-plan")}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-2 text-sm font-semibold rounded-md h-9 px-3 lg:px-4 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-white" />
            Subscribe
          </Button>

          <button
            onClick={() => navigate("/search")}
            className="p-2 hover:bg-zinc-800/60 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link to="/profile">
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
        <Dock className="w-full max-w-sm bg-black/40 border border-zinc-800/50 backdrop-blur-lg px-2 mx-0 shadow-2xl h-14 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
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
                {isActive && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 dark:bg-primary/20 bg-primary/10 rounded-3xl -z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
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
