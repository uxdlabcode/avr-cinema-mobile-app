import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Check, Play } from "lucide-react";
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
          <button
            tabIndex={-1}
            onClick={() => handleScroll("left")}
            className="focusable absolute left-[-20px] md:left-[-35px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRight && (
          <button
            tabIndex={-1}
            onClick={() => handleScroll("right")}
            className="focusable absolute right-[-20px] md:right-[-35px] lg:right-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scrollable Row */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto overflow-y-visible pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-8 sm:gap-12 md:gap-14 pl-8 sm:pl-12 md:pl-16 lg:pl-7"
          style={{ overflowY: 'visible' }}
        >
          {items.map((movie, index) => (
            <div
              key={movie.id}
              className="flex-none relative snap-start group/trending pt-4"
              style={{ zIndex: 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
              onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
            >
              {/* Giant rank number */}
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
                className="focusable relative z-20 flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/trending:scale-105"
                onClick={() => navigate(`/video/${movie.id}`)}
              >
                <img
                  src={movie.signedThumbnailUrl || "/assets/poster.png"}
                  alt={movie.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Floating Popup */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[340px] opacity-0 pointer-events-none group-hover/trending:opacity-100 group-hover/trending:pointer-events-auto transition-all duration-200 rounded-xl overflow-hidden bg-zinc-900 shadow-2xl shadow-black/80 border border-zinc-700/80 z-50">
                {/* Landscape Thumbnail */}
                <div className="w-full aspect-video overflow-hidden relative">
                  <img
                    src={movie.signedThumbnailUrl || "/assets/poster.png"}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-lg">{movie.title}</p>
                  </div>
                </div>

                {/* Details Panel */}
                <div className="p-3 flex flex-col gap-2.5">
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); navigate(`/video/${movie.id}`); }}
                      className="focusable flex-1 py-1.5 bg-white text-black hover:bg-zinc-200 rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Now
                    </button>
                    <button
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); if (toggleWatchlist) toggleWatchlist(movie.id, movie); }}
                      className="focusable w-8 h-8 bg-zinc-800 border border-zinc-700 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow"
                    >
                      {watchlist.includes(movie.id.toString()) ? (
                        <Check className="w-3.5 h-3.5 text-[#DECB94]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 flex-wrap leading-tight select-none">
                    <span className="text-white">{movie.releaseYear || movie.year || 2026}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="px-1 border border-zinc-600 rounded text-[9px] leading-snug py-0.5 text-zinc-300">{movie.ageRating || movie.rating || "U/A"}</span>
                    <span className="text-zinc-600">•</span>
                    <span>{movie.seasons && movie.seasons.length > 0 ? `${movie.seasons.length} Seasons` : (movie.duration || "N/A")}</span>
                    {movie.language && <><span className="text-zinc-600">•</span><span>{movie.language}</span></>}
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-zinc-400 line-clamp-4 leading-relaxed">
                    {movie.description || "No description available."}
                  </p>
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