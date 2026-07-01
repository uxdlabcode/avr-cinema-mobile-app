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
      dispatch(fetchMovieMedia({ limitVal: 20 }));
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
          <div
            className="flex overflow-x-auto scrollbar-hide gap-8 sm:gap-12 md:gap-11 w-full"
            style={{
              overflowY: 'visible',
              paddingTop: '80px',
              marginTop: '-80px',
              paddingBottom: '180px',
              marginBottom: '-180px',
              paddingLeft: '48px', // pl-12
              paddingRight: '48px',
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => {
              const isFirst = index === 0;
              return (
                <div
                  key={index}
                  className="flex-none relative pt-4"
                  style={{
                    paddingLeft: isFirst ? '20px' : '0px',
                  }}
                >
                  <span
                    className="absolute left-0 bottom-[-2px] md:bottom-[-8px] text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black leading-none select-none z-30 pointer-events-none"
                    style={{
                      WebkitTextStroke: "2px #27272a",
                      color: "transparent",
                      fontFamily: '"Oswald", "Arial Narrow", sans-serif',
                      transform: isFirst ? 'translateX(-25%)' : 'translateX(-45%)',
                      fontSize: isFirst ? 'clamp(2.5rem, 8vw, 6rem)' : undefined,
                    }}
                  >
                    {index + 1}
                  </span>
                  <Skeleton className="relative z-20 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900" />
                </div>
              );
            })}
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

        {/* Horizontal Scrollable Row - FIXED */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth gap-8 sm:gap-12 md:gap-11"
          style={{
            overflowY: 'visible',
            paddingTop: '80px',
            marginTop: '-80px',
            paddingBottom: '180px',
            marginBottom: '-180px',
            paddingLeft: '48px', // pl-12
            paddingRight: '48px', // added right padding for last item
          }}
        >
          {items.map((movie, index) => {
            const isFirst = index === 0;
            const isLast = index === items.length - 1;

            return (
              <div
                key={movie.id}
                className="flex-none relative snap-start group/trending pt-4"
                style={{
                  zIndex: 1,
                  // Add extra left padding for first item to show number fully
                  paddingLeft: isFirst ? '20px' : '0px',
                  // Add extra right padding for last item
                  paddingRight: isLast ? '20px' : '0px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
              >
                {/* Giant rank number - FIXED positioning */}
                <span
                  className="absolute left-0 bottom-[-2px] md:bottom-[-8px] text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black leading-none select-none z-30 pointer-events-none transition-transform duration-300 group-hover/trending:scale-105"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 40%, #71717a 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: '"Oswald", "Arial Narrow", sans-serif',
                    // FIX: Adjust position so number doesn't get cut off
                    transform: isFirst ? 'translateX(-25%)' : 'translateX(-45%)',
                    // Make number slightly smaller for first item to ensure it fits
                    fontSize: isFirst ? 'clamp(2.5rem, 8vw, 6rem)' : undefined,
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
                <div
                  className={`absolute top-1/2 w-[360px] opacity-0 scale-90 pointer-events-none group-hover/trending:opacity-100 group-hover/trending:scale-100 group-hover/trending:pointer-events-auto transition-all duration-300 ease-out rounded-xl overflow-hidden bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.95)] border border-zinc-700/50 z-50 ${isFirst
                    ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                    : isLast
                      ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                      : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                    }`}
                >
                  {/* Landscape Thumbnail */}
                  <div className="w-full h-[190px] overflow-hidden relative">
                    <img
                      src={movie.signedThumbnailUrl || "/assets/poster.png"}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                  </div>

                  {/* Details Panel */}
                  <div className="px-4 py-3 flex flex-col gap-2.5">
                    <p className="text-white font-bold text-[15px] leading-snug">{movie.title}</p>

                    <div className="flex items-center gap-2">
                      <button
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); navigate(`/video/${movie.id}`); }}
                        className="focusable flex-1 py-2 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current" /> Watch Now
                      </button>
                      <button
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); if (toggleWatchlist) toggleWatchlist(movie.id, movie); }}
                        className="focusable w-9 h-9 bg-zinc-800 border border-zinc-600 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow"
                      >
                        {watchlist.includes(movie.id.toString()) ? (
                          <Check className="w-4 h-4 text-[#DECB94]" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap leading-tight select-none">
                      <span className="text-white font-bold">{movie.releaseYear || movie.year || 2026}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-300">{movie.ageRating || movie.rating || "U/A"}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{movie.seasons && movie.seasons.length > 0 ? `${movie.seasons.length} Seasons` : (movie.duration || "N/A")}</span>
                      {movie.language && <><span className="text-zinc-600">•</span><span>{movie.language}</span></>}
                    </div>

                    <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                      {movie.description || "No description available."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default TrendNow;