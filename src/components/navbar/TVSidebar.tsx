import React, { useState, useEffect } from "react";
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
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/Firebase/firebase";

export function TVSidebar() {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
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
      className={`fixed left-0 top-0 bottom-0 h-screen z-50 transition-all duration-300 ease-in-out flex flex-col items-start pt-8 pb-8 border-r-0 overflow-hidden pointer-events-none ${isExpanded
        ? "w-[280px] bg-gradient-to-r from-black/80 via-black/88 via-[50%] to-transparent"
        : "w-[80px] bg-gradient-to-r from-black via-black/90 to-transparent"
        }`}
    >
      <div
        className="h-full flex flex-col items-start pointer-events-auto w-[250px] shrink-0"
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
        <div className="w-full flex items-center mb-10 h-14 pl-7">
          <img
            src="/assets/logo.jpg"
            alt="AVR Logo"
            className="h-10 w-[45px] object-contain transition-transform duration-300 hover:scale-105"
          />
        </div>

        {/* Nav Items */}
        <nav className="focusable flex-1 w-full flex flex-col space-y-4">
          {tvNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`focusable flex items-center gap-5 py-3 w-full outline-none transition-colors duration-300 group pl-[28px] ${isActive
                  ? "text-primary font-bold"
                  : "text-zinc-400 hover:text-white"
                  }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isActive ? "text-primary scale-110" : "text-zinc-400 group-hover:text-white group-hover:scale-105"
                    }`}
                />
                <span
                  className={`text-[15px] font-semibold transition-all duration-300 ease-in-out whitespace-nowrap ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                    } ${isActive ? "text-primary" : "text-zinc-400 group-hover:text-white"
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Profile/Subscription status at the bottom */}
        <div className="w-full border-t border-zinc-800/40 pt-6 flex flex-col items-center">
          {user?.membershipStatus === "active" ? (
            <Link
              to="/membership"
              className="focusable mb-4 py-2 flex items-center gap-4 text-primary w-full pl-[28px]"
              title="Premium Active"
            >
              <Crown className="w-5 h-5 text-amber-400 shrink-0" />
              <span
                className={`text-xs font-bold text-amber-400 uppercase tracking-wider truncate transition-all duration-300 ease-in-out whitespace-nowrap ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                  }`}
              >
                {currentPlanName}
              </span>
            </Link>
          ) : (
            <div
              className={`text-[10px] text-zinc-500 font-bold uppercase tracking-wider text-left w-full pl-8 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                }`}
            >
              {currentPlanName}
            </div>
          )}
          <Link
            to="/profile"
            className="focusable flex items-center w-full py-2 rounded-lg gap-4 transition-colors duration-200 outline-none border border-transparent focus:border-zinc-700 hover:bg-zinc-800/35 cursor-pointer pl-[22px]"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-white shadow shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div
              className={`flex flex-col text-left transition-all duration-300 ease-in-out ${isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 pointer-events-none"
                }`}
            >
              <span className="text-xs font-semibold text-zinc-300 truncate">
                {user?.name || "Guest User"}
              </span>
              <span className="text-[10px] text-zinc-500 truncate">
                {user?.membershipStatus === "active" ? "Premium" : "Free Plan"}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
