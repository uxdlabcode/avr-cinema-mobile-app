import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share2,
  Play,
  Plus,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { compoundQuery, deleteDocument, createDocument } from "@/Firebase";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { fetchTvMedia } from "@/store/slices/tvSlice";
import { filterByUserAge } from "@/lib/ageFilter";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import RecentTVShows from "../tvstreaming/Episode";
import DocumentaryList from "../tvstreaming/DocumentaryList";

interface TVItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  duration?: string;
  releaseYear?: number;
  category?: string;
  [key: string]: any;
}

const TvTabSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-14 md:pb-0 pt-24 px-4 animate-pulse">
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero banner skeleton */}
      <div className="w-full h-[50vh] md:h-[65vh] bg-zinc-950 rounded-lg" />

      {/* Dynamic categories skeleton */}
      {[1, 2].map((categoryIdx) => (
        <div key={categoryIdx} className="space-y-4">
          <Skeleton className="h-6 w-40 bg-zinc-900 rounded" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900 shrink-0"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TVCategoryRow = ({
  genreName,
  list,
  navigate,
  isTrending = false,
  watchlist,
  toggleWatchlist,
}: {
  genreName: string;
  list: TVItem[];
  navigate: ReturnType<typeof useNavigate>;
  isTrending?: boolean;
  watchlist: string[];
  toggleWatchlist: (movieId: string, movieData: any) => void;
}) => {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const displayList = isTrending ? list.slice(0, 10) : list.slice(0, 20);

  const updateScrollButtons = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    const row = rowRef.current;
    if (row) {
      row.addEventListener("scroll", updateScrollButtons);
      // Run once initially
      updateScrollButtons();

      // Also listen to resize
      window.addEventListener("resize", updateScrollButtons);

      // Wait a bit for image rendering and layout calculations
      const timer = setTimeout(updateScrollButtons, 500);

      return () => {
        row.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
        clearTimeout(timer);
      };
    }
  }, [list]);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount =
        direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="space-y-1 text-left relative group/row">
      <div className="flex items-center justify-between pr-4">
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide">
          {genreName}
        </h3>
        {list.length > 15 && (
          <button 
            onClick={() => navigate(`/genre/${encodeURIComponent(genreName)}`)}
            className="focusable text-xs md:text-sm text-primary hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer outline-none"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative w-full">
        {/* Left Scroll Button */}
        {showLeft && (
          <button 
            tabIndex={-1}
            onClick={() => handleScroll("left")}
            className="focusable absolute left-[-20px] md:left-[-35px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
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
            className="focusable absolute right-[-20px] md:right-[-35px] lg:right-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scrollable Row */}
        <div
          ref={rowRef}
          className={`flex overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth gap-4 ${isTrending
            ? "pl-8 sm:pl-12 md:pl-16 lg:pl-20"
            : ""
            }`}
          style={{
            overflowY: 'visible',
            paddingTop: '80px',
            marginTop: '-80px',
            paddingBottom: '180px',
            marginBottom: '-180px'
          }}
        >
          {displayList.map((tv, index) => {
            const isFirst = index === 0;
            const isLast = index === displayList.length - 1;

            if (isTrending) {
              return (
                <div
                  key={tv.id}
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

                  {/* TV Card Poster */}
                  <div
                    tabIndex={0}
                    className="focusable relative z-20 flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/trending:scale-105"
                    onClick={() => navigate(`/video/${tv.id}`)}
                  >
                    <img
                      src={tv.signedThumbnailUrl || "/assets/poster.png"}
                      alt={tv.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Floating Popup - centered on card, extends above AND below */}
                  <div
                    className={`absolute top-1/2 w-[360px] opacity-0 scale-90 pointer-events-none group-hover/trending:opacity-100 group-hover/trending:scale-100 group-hover/trending:pointer-events-auto transition-all duration-300 ease-out rounded-xl overflow-hidden bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.95)] border border-zinc-700/50 z-50 ${
                      isFirst
                        ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                        : isLast
                        ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                        : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                    }`}
                  >
                    <div className="w-full h-[190px] overflow-hidden relative">
                      <img
                        src={tv.signedThumbnailUrl || "/assets/poster.png"}
                        alt={tv.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                    </div>
                    <div className="px-4 py-3 flex flex-col gap-2.5">
                      <p className="text-white font-bold text-[15px] leading-snug">{tv.title}</p>
                      <div className="flex items-center gap-2">
                        <button
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); navigate(`/video/${tv.id}`); }}
                          className="focusable flex-1 py-2 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
                        >
                          <Play className="w-4 h-4 fill-current text-black" /> Watch Now
                        </button>
                        <button
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); toggleWatchlist(tv.id, tv); }}
                          className="focusable w-9 h-9 bg-zinc-800 border border-zinc-600 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow"
                        >
                          {watchlist.includes(tv.id.toString()) ? (
                            <Check className="w-4 h-4 text-[#DECB94]" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap leading-tight select-none">
                        <span className="text-white font-bold">{tv.releaseYear || tv.year || 2026}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-300">{tv.ageRating || tv.rating || "U/A"}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{tv.seasons && tv.seasons.length > 0 ? `${tv.seasons.length} Seasons` : (tv.duration || "N/A")}</span>
                        {tv.language && <><span className="text-zinc-600">•</span><span>{tv.language}</span></>}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                        {tv.description || "No description available."}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Normal TV Row Item - Hotstar-style floating popup
            return (
              <div
                key={tv.id}
                className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] snap-start relative group/card"
                style={{ zIndex: 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
              >
                {/* Poster Card - always visible */}
                <div
                  tabIndex={0}
                  className="focusable w-full aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/card:scale-105"
                  onClick={() => navigate(`/video/${tv.id}`)}
                >
                  <img
                    src={tv.signedThumbnailUrl || "/assets/poster.png"}
                    alt={tv.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Floating Popup - centered on card, extends above AND below */}
                <div
                  className={`absolute top-1/2 w-[360px] opacity-0 scale-90 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto transition-all duration-300 ease-out rounded-xl overflow-hidden bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.95)] border border-zinc-700/50 z-50 ${
                    isFirst
                      ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                      : isLast
                      ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                      : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                  }`}
                >
                  <div className="w-full h-[190px] overflow-hidden relative">
                    <img
                      src={tv.signedThumbnailUrl || "/assets/poster.png"}
                      alt={tv.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2.5">
                    <p className="text-white font-bold text-[15px] leading-snug">{tv.title}</p>
                    <div className="flex items-center gap-2">
                      <button
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); navigate(`/video/${tv.id}`); }}
                        className="focusable flex-1 py-2 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
                      >
                        <Play className="w-4 h-4 fill-current text-black" /> Watch Now
                      </button>
                      <button
                        tabIndex={-1}
                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(tv.id, tv); }}
                        className="focusable w-9 h-9 bg-zinc-800 border border-zinc-600 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow"
                      >
                        {watchlist.includes(tv.id.toString()) ? (
                          <Check className="w-4 h-4 text-[#DECB94]" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap leading-tight select-none">
                      <span className="text-white font-bold">{tv.releaseYear || tv.year || 2026}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-300">{tv.ageRating || tv.rating || "U/A"}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{tv.seasons && tv.seasons.length > 0 ? `${tv.seasons.length} Seasons` : (tv.duration || "N/A")}</span>
                      {tv.language && <><span className="text-zinc-600">•</span><span>{tv.language}</span></>}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                      {tv.description || "No description available."}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {list.length > 20 && !isTrending && (
            <div 
              onClick={() => navigate(`/genre/${encodeURIComponent(genreName)}`)}
              className="focusable flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/60 snap-start flex flex-col items-center justify-center gap-3 transition-colors outline-none"
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
};

const TvTab = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const mediaItems = useSelector((state: RootState) => state.tv.items);
  const mediaStatus = useSelector((state: RootState) => state.tv.status);
  const hasMore = useSelector((state: RootState) => state.tv.hasMore);
  const observerTarget = useRef<HTMLDivElement>(null);

  const isLoading = mediaStatus === "loading" || mediaStatus === "idle";
  const [tvShows, setTvShows] = useState<TVItem[]>([]);
  const [groupedTV, setGroupedTV] = useState<Record<string, TVItem[]>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "forYou";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Featured hero carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Fetch watchlist state
  useEffect(() => {
    if (!userId) {
      try {
        const localList = JSON.parse(localStorage.getItem("avr_my_list") || "[]");
        setWatchlist(localList);
      } catch { }
      return;
    }
    const fetchWatchlist = async () => {
      try {
        const list = await compoundQuery("my_list", [
          { key: "userId", operator: "==", value: userId },
        ]);
        setWatchlist(list.map((item: any) => item.movieId?.toString()));
      } catch (err) {
        console.error("Error fetching watchlist:", err);
      }
    };
    fetchWatchlist();
  }, [userId]);

  // Toggle watchlist logic
  const toggleWatchlist = async (movieId: string, movieData: any) => {
    const isCurrentlyIn = watchlist.includes(movieId.toString());
    if (userId) {
      const docId = `${userId}_${movieId}`;
      if (isCurrentlyIn) {
        try {
          await deleteDocument("my_list", docId);
          setWatchlist(prev => prev.filter(id => id !== movieId.toString()));
          toast.success("Removed from wishlist");
        } catch (err) {
          console.error("Error removing from watchlist:", err);
        }
      } else {
        try {
          const payload = {
            id: docId,
            userId,
            movieId: movieId.toString(),
            addedAt: new Date(),
            title: movieData.title,
            image: movieData.signedThumbnailUrl || movieData.thumbnailUrl || "/assets/poster.png",
            category: movieData.category || "TV Show",
            year: movieData.releaseYear || "2026",
            rating: movieData.ageRating || "U/A 13+",
            duration: movieData.duration || "N/A"
          };
          await createDocument("my_list", docId, payload);
          setWatchlist(prev => [...prev, movieId.toString()]);
          toast.success("Added to wishlist");
        } catch (err) {
          console.error("Error adding to watchlist:", err);
        }
      }
    } else {
      try {
        const localList = JSON.parse(localStorage.getItem("avr_my_list") || "[]");
        let updatedList;
        if (isCurrentlyIn) {
          updatedList = localList.filter((id: string) => id !== movieId.toString());
          toast.success("Removed from wishlist");
        } else {
          updatedList = [...localList, movieId.toString()];
          toast.success("Added to wishlist");
        }
        localStorage.setItem("avr_my_list", JSON.stringify(updatedList));
        setWatchlist(updatedList);
      } catch (err) {
        console.error("Error updating local watchlist:", err);
      }
    }
  };

  // Fetch media from Redux
  useEffect(() => {
    if (mediaStatus === "idle") {
      dispatch(fetchTvMedia({ limitVal: 20 }));
    }
  }, [mediaStatus, dispatch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          mediaStatus !== "loading" &&
          mediaStatus !== "loadingMore" &&
          mediaStatus !== "idle"
        ) {
          dispatch(fetchTvMedia({ limitVal: 20, loadMore: true }));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, mediaStatus, dispatch]);

  useEffect(() => {
    if (mediaItems.length > 0) {
      const shows = mediaItems.filter(item => item.category === "TV Show") as TVItem[];
      const filtered = filterByUserAge(shows, user?.age ?? null);
      setTvShows(filtered);
    }
  }, [mediaItems, user?.age]);

  // Dynamically group TV shows by genre
  useEffect(() => {
    if (tvShows.length === 0) return;

    const groups: Record<string, TVItem[]> = {};

    tvShows.forEach((show) => {
      if (show.genres && show.genres.length > 0) {
        show.genres.forEach((genre) => {
          if (!groups[genre]) {
            groups[genre] = [];
          }
          if (!groups[genre].some((m) => m.id === show.id)) {
            groups[genre].push(show);
          }
        });
      } else {
        const fallback = "Trending Shows";
        if (!groups[fallback]) {
          groups[fallback] = [];
        }
        if (!groups[fallback].some((m) => m.id === show.id)) {
          groups[fallback].push(show);
        }
      }
    });

    if (!groups["Trending Now"]) {
      groups["Trending Now"] = tvShows;
    }

    setGroupedTV(groups);
  }, [tvShows]);

  // Synchronize carousel slide snaps
  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.scrollTo(0, true);
    setCurrentSlide(0);

    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
      // Collapse expanded state on slide change
      setExpandedShowId(null);
      setShowFullDescription(false);
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Auto scroll featured hero TV shows every 6 seconds (pauses when expanded details are open or tab is hidden)
  useEffect(() => {
    if (!carouselApi || tvShows.length === 0 || expandedShowId !== null) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (!timer) {
        timer = setInterval(() => {
          carouselApi.scrollNext();
        }, 6000);
      }
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    if (!document.hidden) {
      startTimer();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [carouselApi, tvShows, expandedShowId]);

  const featuredList = tvShows.slice(0, 4); // Use first 4 TV shows as featured banners

  return (
    <div className="min-h-screen bg-black text-white w-full pb-14 md:pb-0 relative pt-14">
      {/* Semi-transparent Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm z-50 flex items-center justify-between px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="focusable w-10 h-10 rounded-full bg-black/60 border border-zinc-900/60 hover:bg-zinc-800 text-white outline-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Center Logo */}
        <img
          src="/assets/headerLogo.png"
          alt="AVR Cinema"
          className="h-8 object-contain absolute left-1/2 -translate-x-1/2"
        />
      </div>

      {isLoading ? (
        <TvTabSkeleton />
      ) : (
        <div className="flex flex-col">
          {/* Featured Hero Slideshow Carousel */}
          {featuredList.length > 0 && (
            <Carousel
              setApi={setCarouselApi}
              opts={{
                align: "start",
                loop: true,
                duration: 60,
              }}
              className="w-full relative border-b border-zinc-900 overflow-hidden"
            >
              <CarouselContent className="ml-0">
                {featuredList.map((featuredShow) => {
                  const isExpanded = expandedShowId === featuredShow.id;
                  const titleParts = featuredShow.title.split(":");
                  const mainTitle = titleParts[0]?.trim();
                  const subTitle = titleParts[1]?.trim();
                  const tags = featuredShow.genres && featuredShow.genres.length > 0
                    ? featuredShow.genres
                    : (featuredShow.category ? [featuredShow.category] : ["Featured", "Trending"]);

                  return (
                    <CarouselItem
                      key={featuredShow.id}
                      tabIndex={0}
                      className="focusable pl-0 relative w-full min-h-[75vh] md:min-h-[88vh] h-auto flex flex-col justify-end cursor-pointer"
                      onClick={() => navigate(`/video/${featuredShow.id}`)}
                    >
                      {/* Age Rating Badge */}
                      {featuredShow.ageRating && (
                        <div className="absolute md:top-20 top-7 md:top-8 left-6 md:left-16 z-20 px-3 py-1 bg-black/60 border border-primary-foreground/40 rounded text-xs font-bold text-primary-foreground backdrop-blur-sm select-none">
                          {featuredShow.ageRating}
                        </div>
                      )}

                      {/* Background Image */}
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <img
                          src={featuredShow.signedThumbnailUrl || "/assets/poster.png"}
                          alt={featuredShow.title}
                          className="w-full h-full object-cover object-top"
                        />
                        {/* Bottom Gradient Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black via-black/80 to-transparent z-[1]" />
                      </div>

                      {/* Hero Content Overlay */}
                      <div className="relative z-10 w-full px-6 md:px-16 pb-12 md:pb-20 flex flex-col justify-end h-full">

                        {/* MOBILE & TABLET LAYOUT (Centered metadata and play buttons) */}
                        <div className="md:hidden flex flex-col items-center text-center px-4 w-full">
                          <h1 className="text-3xl font-bold tracking-tight mb-3 drop-shadow-xl uppercase text-[#ffffff]">
                            {featuredShow.title}
                          </h1>

                          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#DECB94] mb-6 drop-shadow-md">
                            {tags.map((tag: string, index: number) => (
                              <div key={tag} className="flex items-center gap-2">
                                <span>{tag}</span>
                                {index < tags.length - 1 && (
                                  <span className="w-1 h-1 rounded-full bg-zinc-500" />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-3 w-full pb-4 px-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/video/${featuredShow.id}`);
                              }}
                              className="focusable flex-1 bg-[#ffffff] hover:bg-white/90 text-[#000000] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm font-bold shadow-md w-full outline-none"
                            >
                              <Play className="w-4 h-4 fill-current text-black" />
                              <span>Play</span>
                            </Button>

                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(featuredShow.id, featuredShow);
                              }}
                              className="focusable flex-1 bg-zinc-900/60 border border-zinc-700 text-[#ffffff] hover:bg-zinc-850 px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full backdrop-blur-sm outline-none"
                            >
                              <Plus className="w-4 h-4 mr-1 text-[#DECB94]" />
                              <span>{watchlist.includes(featuredShow.id.toString()) ? "In My List" : "My List"}</span>
                            </Button>
                          </div>
                        </div>

                        {/* DESKTOP WEB LAYOUT */}
                        <div className="hidden md:block w-full">
                          {!isExpanded ? (
                            /* Compact Desktop Layout (Image 1) */
                            <div className="flex flex-col items-start text-left max-w-2xl animate-fade-in relative z-20">
                              {/* New Series Badge */}
                              <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white px-2.5 py-0.5 rounded uppercase tracking-widest mb-3">
                                New Series
                              </span>

                              {/* Title */}
                              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-1 drop-shadow-md text-[#ffffff] uppercase leading-tight">
                                {mainTitle}
                              </h1>
                              {subTitle && (
                                <h2 className="text-xl lg:text-2xl font-bold tracking-wide mb-3 text-white uppercase opacity-90 drop-shadow-sm">
                                  {subTitle}
                                </h2>
                              )}

                              {/* Sponsor Brand Logos */}
                              <div className="flex items-center gap-2 mb-4 text-[10px] tracking-wider text-zinc-400 font-bold select-none">
                                <span className="opacity-60 text-[9px]">CO-PRESENTED BY:</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">LIVEX</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">NITTO</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">TITAN</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">CAMPUS</span>
                              </div>

                              {/* Genres metadata */}
                              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-6 select-none">
                                <span>{featuredShow.language || "English"}</span>
                                <span className="text-zinc-650">|</span>
                                <span>{featuredShow.genres?.join(", ") || tags.join(", ")}</span>
                              </div>

                              {/* Buttons Row */}
                              <div className="flex items-center gap-4">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/video/${featuredShow.id}`);
                                  }}
                                  className="focusable bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-[150px] outline-none"
                                >
                                  <Play className="w-4 h-4 fill-current text-black" />
                                  <span>Play</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedShowId(featuredShow.id);
                                  }}
                                  className="focusable bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-white px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow backdrop-blur-sm font-bold w-[150px] outline-none"
                                >
                                  <span>More Info</span>
                                </Button>

                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(featuredShow.id, featuredShow);
                                  }}
                                  className="focusable focusable text-white hover:text-white/80 gap-2.5 flex items-center cursor-pointer text-sm font-bold ml-2 transition-colors select-none outline-none"
                                >
                                  <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                                    {watchlist.includes(featuredShow.id.toString()) ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3] text-[#DECB94]" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                  </div>
                                  <span>{watchlist.includes(featuredShow.id.toString()) ? "In My List" : "Add to My List"}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Expanded Desktop Layout (Image 2 & 3) */
                            <div className="flex flex-col items-start text-left max-w-2xl animate-fade-in relative z-20 select-text pb-6 md:pb-8">
                              {/* New Series Badge */}
                              <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white px-2.5 py-0.5 rounded uppercase tracking-widest mb-3">
                                New Series
                              </span>

                              {/* Title */}
                              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-1 drop-shadow-md text-[#ffffff] uppercase leading-tight">
                                {mainTitle}
                              </h1>
                              {subTitle && (
                                <h2 className="text-xl lg:text-2xl font-bold tracking-wide mb-3 text-white uppercase opacity-90 drop-shadow-sm">
                                  {subTitle}
                                </h2>
                              )}

                              {/* Sponsor Brand Logos */}
                              <div className="flex items-center gap-2 mb-4 text-[10px] tracking-wider text-zinc-400 font-bold select-none">
                                <span className="opacity-60 text-[9px]">CO-PRESENTED BY:</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">LIVEX</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">NITTO</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">TITAN</span>
                                <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">CAMPUS</span>
                              </div>

                              {/* Metadata Details Row */}
                              <div className="flex items-center gap-3 text-xs font-bold text-zinc-350 mb-6 select-none">
                                <span>
                                  {featuredShow.seasons?.length > 0
                                    ? `${featuredShow.seasons.length} Season${featuredShow.seasons.length > 1 ? "s" : ""} ${featuredShow.seasons.reduce((acc: number, s: any) => acc + (s.episodes?.length || 0), 0) || 6} Episodes`
                                    : "1 Season 6 Episodes"}
                                </span>
                                <span className="text-zinc-650">|</span>
                                <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-200">{featuredShow.ageRating || "U/A 13+"}</span>
                                <span className="text-zinc-650">|</span>
                                <span>{featuredShow.releaseYear || "2026"}</span>
                                <span className="text-zinc-650">|</span>
                                <span>{featuredShow.language || "English"}</span>
                              </div>

                              {/* Resume / Play & My List Buttons */}
                              <div className="flex items-center gap-4 mb-6">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/video/${featuredShow.id}`);
                                  }}
                                  className="focusable bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md outline-none"
                                >
                                  <Play className="w-4 h-4 fill-current text-black" />
                                  <span>Resume S1 E1</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(featuredShow.id, featuredShow);
                                  }}
                                  className="focusable bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-[#ffffff] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2.5 text-sm shadow backdrop-blur-sm font-bold outline-none"
                                >
                                  <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                                    {watchlist.includes(featuredShow.id.toString()) ? (
                                      <Check className="w-3 h-3 stroke-[2.5] text-[#DECB94]" />
                                    ) : (
                                      <Plus className="w-3 h-3 stroke-[2.5]" />
                                    )}
                                  </div>
                                  <span>{watchlist.includes(featuredShow.id.toString()) ? "In My List" : "Add to My List"}</span>
                                </Button>
                              </div>

                              {/* Detailed Description Panel */}
                              <div className="space-y-4 text-left w-full relative">
                                {/* Close Expanded Info */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedShowId(null);
                                    setShowFullDescription(false);
                                  }}
                                  className="focusable focusable absolute -top-12 right-0 p-1.5 bg-zinc-950/80 hover:bg-zinc-800 rounded-full text-white cursor-pointer border border-zinc-800 transition-colors z-30 outline-none"
                                  title="Close info panel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>

                                <h3 className="text-xl font-extrabold text-white leading-snug">
                                  {featuredShow.title}
                                </h3>

                                <div className="space-y-1.5 text-xs font-semibold select-none">
                                  <div>
                                    <span className="text-zinc-500 font-bold">Genre</span>{" "}
                                    <span className="text-zinc-200 ml-2">{featuredShow.genres?.join(", ") || tags.join(", ")}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 font-bold">Content Descriptor</span>{" "}
                                    <span className="text-zinc-200 ml-2">{featuredShow.contentDescriptor || "General Audience"}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 font-bold">Publisher</span>{" "}
                                    <span className="text-zinc-200 ml-2">{featuredShow.publisher || "Almighty Motion Picture"}</span>
                                  </div>
                                  {featuredShow.cast && featuredShow.cast.length > 0 && (
                                    <div>
                                      <span className="text-zinc-500 font-bold">Cast</span>{" "}
                                      <span className="text-zinc-200 ml-2">
                                        {featuredShow.cast.map((c: any) => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-xs md:text-sm text-zinc-350 leading-relaxed font-normal mt-4">
                                  {showFullDescription ? (
                                    <div className="space-y-4 animate-fade-in select-text">
                                      {featuredShow.description ? (
                                        featuredShow.description.split("\n").map((p: string, idx: number) => (
                                          <p key={idx}>{p.trim()}</p>
                                        ))
                                      ) : (
                                        <p>No description available.</p>
                                      )}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowFullDescription(false);
                                        }}
                                        className="focusable focusable text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors outline-none"
                                      >
                                        See Less
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="animate-fade-in">
                                      <p className="line-clamp-3 select-all">{featuredShow.description || "No description available."}</p>
                                      {featuredShow.description && featuredShow.description.length > 150 && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullDescription(true);
                                          }}
                                          className="focusable focusable text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors outline-none"
                                        >
                                          See More <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          )}
                        </div>

                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>

              {/* Slider Dots indicators */}
              <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-1.5 md:pointer-events-none">
                <div className="flex items-center justify-center gap-1.5 md:pointer-events-auto">
                  {featuredList.map((_, index) => (
                    <button 
                      key={index}
                      tabIndex={-1}
                      onClick={() => carouselApi?.scrollTo(index)}
                      className={`focusable h-1.5 rounded-full transition-all duration-300 ${currentSlide === index
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-white/50 hover:bg-white"
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Slider Controls (Left, Right arrows) */}
              <div className="hidden md:flex absolute bottom-6 right-12 z-20 items-center gap-3 select-none">
                <button 
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    carouselApi?.scrollPrev();
                  }}
                  className="focusable w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
                  aria-label="Previous featured banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button 
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    carouselApi?.scrollNext();
                  }}
                  className="focusable w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
                  aria-label="Next featured banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </Carousel>
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-6 px-4 md:px-12 lg:px-16 pt-6 pb-0 border-b border-zinc-900 w-full max-w-7xl mx-auto">
            <button 
              onClick={() => setActiveTab("forYou")}
              className={`focusable focusable pb-3 text-sm md:text-base font-semibold transition-colors relative outline-none ${activeTab === "forYou" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              For You
              {activeTab === "forYou" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
            <button 
              onClick={() => setActiveTab("tvShows")}
              className={`focusable focusable pb-3 text-sm md:text-base font-semibold transition-colors relative outline-none ${activeTab === "tvShows" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              TV Shows
              {activeTab === "tvShows" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
            <button 
              onClick={() => setActiveTab("documentaries")}
              className={`focusable focusable pb-3 text-sm md:text-base font-semibold transition-colors relative outline-none ${activeTab === "documentaries" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              Documentaries
              {activeTab === "documentaries" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
          </div>

          {/* Dynamic Content based on active tab */}
          <div className="px-4 md:px-12 lg:px-16 pt-8 pb-24 space-y-10 w-full max-w-7xl mx-auto">
            {activeTab === "forYou" && (
              <>
                {Object.keys(groupedTV).map((genreName) => {
                  const list = groupedTV[genreName];
                  if (list.length === 0) return null;

                  return (
                    <TVCategoryRow
                      key={genreName}
                      genreName={genreName}
                      list={list}
                      navigate={navigate}
                      watchlist={watchlist}
                      toggleWatchlist={toggleWatchlist}
                      isTrending={
                        genreName === "Trending Now" ||
                        genreName === "Trending Shows" ||
                        genreName === "Trending"
                      }
                    />
                  );
                })}
              </>
            )}

            {activeTab === "tvShows" && (
              <RecentTVShows isGrid={true} watchlist={watchlist} toggleWatchlist={toggleWatchlist} />
            )}

            {activeTab === "documentaries" && (
              <DocumentaryList isGrid={true} watchlist={watchlist} toggleWatchlist={toggleWatchlist} />
            )}
          </div>

          {/* Lazy load trigger element */}
          {hasMore && (
            <div ref={observerTarget} className="w-full py-8 flex justify-center items-center">
              {mediaStatus === "loadingMore" && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TvTab;
