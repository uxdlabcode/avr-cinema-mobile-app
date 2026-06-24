import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { getCollectionData, getSignedUrl } from "@/Firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchTrailerMedia } from "@/store/slices/trailerSlice";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";

interface TrailerItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  category: string;
  [key: string]: any;
}

interface Props {
  isGrid?: boolean;
}

const Trailer: React.FC<Props> = ({ isGrid = true }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const trailers = useSelector((state: RootState) => state.trailer.items);
  const trailerStatus = useSelector((state: RootState) => state.trailer.status);
  const trailerError = useSelector((state: RootState) => state.trailer.error);

  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    if (trailerStatus === "idle") {
      dispatch(fetchTrailerMedia());
    }
  }, [trailerStatus, dispatch]);

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
  }, [trailers]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      rowRef.current.scrollBy({
        left: direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75,
        behavior: "smooth",
      });
    }
  };

  const isLoading = trailerStatus === "loading" || trailerStatus === "idle";

  if (!isGrid) {
    if (isLoading) {
      return (
        <div className="space-y-3 w-full text-left">
          <Skeleton className="h-8 w-48 bg-zinc-900 mb-4" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="relative shrink-0 w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px] aspect-video rounded-md bg-zinc-900"
              />
            ))}
          </div>
        </div>
      );
    }

    if (trailerError || trailers.length === 0) return null;

    return (
      <div className="text-left relative group/row w-full space-y-1">
        <div className="flex items-center justify-between pr-4 mb-3">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide">
              Trailers
            </h3>
          </div>
          {trailers.length > 15 && (
            <button 
              onClick={() => navigate(`/genre/Trailer`)}
              className="focusable text-xs md:text-sm text-primary hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer outline-none"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative w-full">
          {/* Left Scroll */}
          {showLeft && (
            <button 
              tabIndex={-1}
              onClick={() => handleScroll("left")}
              className="focusable absolute left-[-20px] md:left-[-35px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Right Scroll */}
          {showRight && (
            <button 
              tabIndex={-1}
              onClick={() => handleScroll("right")}
              className="focusable absolute right-[-20px] md:right-[-35px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Scrollable Row */}
          <div
            ref={rowRef}
            className="flex overflow-x-auto pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-3"
            style={{
              overflowY: 'visible',
              paddingTop: '20px',
              marginTop: '-20px',
              paddingBottom: '20px',
              marginBottom: '-20px'
            }}
          >
            {trailers.slice(0, 15).map((item) => {
              const displayTitle = item.title.toLowerCase().includes("trailer")
                ? item.title
                : `${item.title} | Banner Trailer`;

              const genresList = item.genres && item.genres.length > 0
                ? item.genres.slice(0, 2).join(", ")
                : item.category;
              const displaySubtitle = `Trailer, ${genresList}`;

              return (
                <div 
                  key={item.id}
                  tabIndex={0}
                  onClick={() => navigate(`/video/${item.id}`)}
                  className="focusable focusable flex-none w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px] aspect-video relative rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950 snap-start outline-none"
                >
                  <img
                    src={item.signedThumbnailUrl || "/assets/poster.png"}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/poster.png";
                    }}
                  />

                  {/* Play Overlay Icon on Hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 text-black fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Mobile/Default Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 z-10">
                    <p className="text-xs font-semibold text-white truncate text-center drop-shadow-md">
                      {item.title}
                    </p>
                  </div>

                  {/* Hover Info Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                    <div className="flex justify-end mb-1">
                      <span className="text-[8px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Trailer
                      </span>
                    </div>
                    <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 truncate drop-shadow-md">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-1 truncate">
                      {displaySubtitle}
                    </p>
                  </div>
                </div>
              );
            })}
            {trailers.length > 15 && (
              <div 
                onClick={() => navigate(`/genre/Trailer`)}
                className="focusable flex-none w-[200px] sm:w-[240px] md:w-[280px] lg:w-[320px] aspect-video relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/60 snap-start flex flex-col items-center justify-center gap-3 transition-colors outline-none"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-800 transition-colors">
                  <ChevronRight className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                  View All
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 md:px-12 lg:px-16 pb-24 w-full">
      <div className="mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1 text-left">
          <h1 className="text-3xl font-bold text-white tracking-wide">Trailers</h1>
          <p className="text-zinc-400 text-sm">
            Watch the latest trailers for movies, TV shows, and documentaries.
          </p>
        </div>

        {isLoading ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-lg overflow-hidden bg-[#181d24] border border-zinc-900 shadow-md text-left"
              >
                <div className="w-full aspect-video bg-zinc-950" />
                <div className="p-4 flex-1 flex flex-col justify-between bg-[#12161b] gap-2">
                  <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                  <Skeleton className="h-3 w-1/2 bg-zinc-800 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : trailerError ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20 text-center border border-zinc-900 rounded-2xl bg-zinc-950/20">
            <h3 className="text-lg font-bold text-rose-500 mb-2">Failed to load trailers</h3>
            <p className="text-zinc-500 text-sm">{trailerError}</p>
          </div>
        ) : trailers.length === 0 ? (
          /* Empty State */
          <Empty className="py-20 border border-dashed border-zinc-805/40 bg-zinc-950/25 rounded-2xl w-full max-w-4xl mx-auto text-center">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-primary/10 text-primary animate-pulse mx-auto">
                <Play className="w-6 h-6 text-primary" />
              </EmptyMedia>
              <EmptyTitle className="text-white font-semibold text-lg">No trailers added yet</EmptyTitle>
              <EmptyDescription className="text-zinc-500 max-w-[280px] mx-auto text-xs">
                Check back later for new releases and trailers.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          /* Trailers Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {trailers.map((item) => {
              // Format Title: Ensure it ends with Trailer or add "| Banner Trailer"
              const displayTitle = item.title.toLowerCase().includes("trailer")
                ? item.title
                : `${item.title} | Banner Trailer`;

              // Subtitle: Trailer, Genre1, Genre2 or Category
              const genresList = item.genres && item.genres.length > 0
                ? item.genres.slice(0, 2).join(", ")
                : item.category;
              const displaySubtitle = `Trailer, ${genresList}`;

              return (
                <div 
                  key={item.id}
                  tabIndex={0}
                  onClick={() => navigate(`/video/${item.id}`)}
                  className="focusable focusable flex flex-col rounded-lg overflow-hidden cursor-pointer group bg-[#181d24] border border-zinc-900 transition-all hover:scale-[1.02] hover:border-zinc-700 shadow-md text-left outline-none"
                >
                  {/* Thumbnail / Image container */}
                  <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden">
                    <img
                      src={item.signedThumbnailUrl || "/assets/poster.png"}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/assets/poster.png";
                      }}
                    />
                    {/* Play Button Icon Overlay on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <Play className="w-6 h-6 text-black fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-[#12161b]">
                    <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-zinc-250 transition-colors">
                      {displayTitle}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-2 truncate">
                      {displaySubtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Trailer;
