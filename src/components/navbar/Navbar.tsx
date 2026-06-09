import { Link, useLocation } from "react-router-dom";
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

  const mobileNavItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Tv, label: "TV", path: "/tv" },
    { icon: Search, label: "Search", path: "/search" },
    { icon: Film, label: "Movie", path: "/movies" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const desktopNavItems = [
    { label: "Home", path: "/dashboard" },
    { label: "Movies", path: "/movies" },
    { label: "TV", path: "/tv" },
    { label: "Quiz", path: "/quiz" },
    { label: "Webseries", path: "/webseries" },
  ];

  return (
    <>
      {/* Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between h-[70px] px-6 lg:px-12 bg-black/90 backdrop-blur-sm border-b border-zinc-800/50 sticky top-0 z-50 transition-all">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/assets/headerLogo.png" alt="AVR Logo" className="h-6 md:h-8 object-contain" />
          </Link>
          <Button className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border border-primary-foreground gap-2 text-sm font-semibold rounded-md h-9 px-4">
            <Crown className="w-4 h-4 text-primary-foreground" />
            Subscribe
          </Button>
          <nav className="flex items-center gap-6 ml-4">
            {desktopNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`text-sm font-medium hover:text-white transition-colors ${location.pathname === item.path ? 'text-primary-foreground' : 'text-gray-400'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-9 bg-zinc-900 border-zinc-800 text-sm focus-visible:ring-primary-foreground w-[180px] h-9 rounded-full transition-all focus:w-[240px]"
            />
          </div>
          <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary-foreground transition-all cursor-pointer">
            <AvatarImage src="" />
            <AvatarFallback className="bg-zinc-800 text-sm font-medium">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
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
