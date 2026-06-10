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
          <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-2 text-sm font-semibold rounded-md h-9 px-3 lg:px-4 cursor-pointer">
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

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/50 flex justify-around items-center z-50 px-2 pb-safe">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-1.5 ${isActive ? 'text-primary' : 'text-zinc-500'} hover:text-gray-300 transition-colors w-16`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-zinc-500'}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  );
}
