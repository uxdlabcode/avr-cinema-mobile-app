import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchMovieMedia } from "@/store/slices/movieSlice";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  duration?: string;
  category?: string;
  [key: string]: any;
}

interface TrendNowProps {
  watchlist?: string[];
  toggleWatchlist?: (movieId: string, movieData: any) => void;
}

const TrendNow = ({ watchlist = [], toggleWatchlist }: TrendNowProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const movieItems = useSelector((state: RootState) => state.movie.items);
  const movieStatus = useSelector((state: RootState) => state.movie.status);

  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    if (movieStatus === "idle") {
      dispatch(fetchMovieMedia());
    }
  }, [movieStatus, dispatch]);

  const items = movieItems.slice(0, 10);
  const isLoading = movieStatus === "loading" || movieStatus === "idle";

  const updateScrollButtons = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 5);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const row = rowRef.current;
    if (row) {
      row.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
      
      const timer = setTimeout(updateScrollButtons, 500);

      return () => {
        row.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
        clearTimeout(timer);
      };
    }
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-1 text-left relative group/row w-full animate-pulse">
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide mb-3">
          Trending Now
        </h3>
        
        <div className="relative w-full">
          <div className="flex overflow-x-auto pb-2.5 md:pb-6 scrollbar-hide gap-8 sm:gap-12 md:gap-14 pl-8 sm:pl-12 md:pl-16 lg:pl-20 w-full">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex-none relative pt-4">
                <span
                  className="absolute left-0 bottom-[-2px] md:bottom-[-8px] text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black leading-none select-none z-30 pointer-events-none"
                  style={{
                    WebkitTextStroke: "2px #27272a",
                    color: "#18181b",
                    fontFamily: "Impact, Arial Black, sans-serif",
                    translate: "-50% 0px",
                  }}
                >
                  {index + 1}
                </span>
                <Skeleton className="relative z-20 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-1 text-left relative group/row w-full">
      <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide mb-3">
        Trending Now
      </h3>
      
      <div className="relative w-full">
        {/* Left Scroll Button */}
        {showLeft && (
          <button className="focusable"
            tabIndex={-1}
            onClick={() => handleScroll("left")}
            className="absolute left-[-20px] md:left-[-35px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRight && (
          <button className="focusable"
            tabIndex={-1}
            onClick={() => handleScroll("right")}
            className="absolute right-[-20px] md:right-[-35px] lg:right-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scrollable Row */}
        <div 
          ref={rowRef}
          className="flex overflow-x-auto pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-8 sm:gap-12 md:gap-14 pl-8 sm:pl-12 md:pl-16 lg:pl-20"
        >
          {items.map((movie, index) => (
            <div
              key={movie.id}
              className="flex-none relative snap-start group/trending pt-4"
            >
              {/* Giant rank number with thick white border */}
              <span 
                className="absolute left-0 bottom-[-2px] md:bottom-[-8px] text-6xl sm:text-7xl md:text-8xl lg:text-[9rem] font-black leading-none select-none z-30 pointer-events-none transition-transform duration-300 group-hover/trending:scale-105"
                style={{
                  WebkitTextStroke: "2px #fff",
                  color: "#262626",
                  fontFamily: "Impact, Arial Black, sans-serif",
                  filter: "drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.8))",
                  translate: "-50% 0px",
                }}
              >
                {index + 1}
              </span>

              {/* Movie Card Poster */}
              <div
                tabIndex={0}
                className="focusable relative z-20 flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950 outline-none"
                onClick={() => navigate(`/video/${movie.id}`)}
              >
                <img 
                  src={movie.signedThumbnailUrl || "/assets/poster.png"} 
                  alt={movie.title} 
                  className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
                />

                {/* Mobile Title bar fallback */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 md:hidden z-1">
                  <p className="text-sm font-semibold text-white truncate text-center drop-shadow-md">
                    {movie.title}
                  </p>
                </div>
                
                {/* The theatrical hover details overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                  
                  {/* Genre/Category Badge */}
                  <div className="flex justify-end mb-1 md:mb-2">
                    <span className="text-[8px] md:text-[9px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {movie.genres && movie.genres.length > 0 ? movie.genres[0] : "Movie"}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs md:text-sm font-bold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                    {movie.title}
                  </h4>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[8px] md:text-[9px] font-semibold text-zinc-400 mb-1.5 md:mb-2.5">
                    <span className="truncate">English (UK)</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[8px] md:text-[9px] opacity-85">🌐</span>
                      <span>{movie.duration || "N/A"}</span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <button className="focusable" 
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/video/${movie.id}`);
                      }}
                      className="flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs md:text-sm rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                    >
                      Play Now
                    </button>
                    <button className="focusable" 
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toggleWatchlist) {
                          toggleWatchlist(movie.id, movie);
                        }
                      }}
                      className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                    >
                      {watchlist.includes(movie.id.toString()) ? (
                        <Check className="w-3 h-3 text-[#DECB94]" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendNow;