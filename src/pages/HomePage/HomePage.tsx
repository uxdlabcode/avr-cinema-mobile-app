import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Play, Plus, ChevronRight, ChevronLeft, Volume2, VolumeX, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { compoundQuery, deleteDocument, createDocument } from "@/Firebase";
import { filterByUserAge } from "@/lib/ageFilter";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchHomeMedia } from "@/store/slices/homeSlice";
import RecentWatch from "./RecentWatch";
import TrendNow from "./TrendNow";
import Header from "@/components/Header";
import RecentTVShows from "../tvstreaming/Episode";
import DocumentaryList from "../tvstreaming/DocumentaryList";


const fallbackData = [
  {
    id: "1",
    title: "Anweshippin Kandethum",
    image: "/assets/poster.png",
    thumbnailUrl: "",
    description: "Wrongfully suspended while pursuing the culprit in a missing persons case, a cop seeks redemption – and justice – when he gets a new assignment.",
    category: "Movie",
    releaseYear: 2024,
    ageRating: "A",
    language: "Malayalam",
    publisher: "AVR Cinema Pictures",
    contentDescriptor: "foul language, violence",
    seasons: [],
    genres: ["Understated", "Dark", "Drama", "Detectives"],
    tags: ["Understated", "Dark", "Drama", "Detectives"],
    cast: [{ name: "Tovino Thomas" }, { name: "Indrans" }, { name: "Siddique" }, { name: "Shammi Thilakan" }],
  },
  {
    id: "2",
    title: "Lord of the Rings",
    image: "/assets/episode2.webp",
    thumbnailUrl: "",
    description: "A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth.",
    category: "Movie",
    releaseYear: 2001,
    ageRating: "U/A 13+",
    language: "English",
    publisher: "New Line Cinema",
    contentDescriptor: "fantasy violence",
    seasons: [],
    genres: ["Fantasy", "Epic", "Adventure", "Action"],
    tags: ["Fantasy", "Epic", "Adventure", "Action"],
    cast: [{ name: "Elijah Wood" }, { name: "Ian McKellen" }, { name: "Orlando Bloom" }, { name: "Viggo Mortensen" }],
  }
];

import { HomePageSkeleton } from "./HomePageSkeleton";

const MediaCategoryRow = ({
  genreName,
  list,
  navigate,
  toggleWatchlist,
  watchlist,
}: {
  genreName: string;
  list: any[];
  navigate: ReturnType<typeof useNavigate>;
  toggleWatchlist: (movieId: string, movieData: any) => Promise<void>;
  watchlist: string[];
}) => {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

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
      updateScrollButtons();
      window.addEventListener("resize", updateScrollButtons);
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
      <div className="mb-2 relative z-20">
        <h3
          tabIndex={0}
          onClick={() => navigate(`/genre/${encodeURIComponent(genreName)}?type=all`)}
          className="focusable text-lg md:text-2xl font-bold text-white tracking-wide  inline-flex items-end cursor-pointer hover:text-primary transition-colors  group/title outline-none"
        >
          {genreName} <ChevronRight className="w-5 md:w-7 md:h-7 h-5   transition-transform " />
        </h3>
      </div>

      <div className="relative w-full">
        {/* Left Scroll Button */}
        {showLeft && (
          <button
            tabIndex={-1}
            onClick={() => handleScroll("left")}
            className="focusable absolute left-[-20px] md:left-[-15px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-[60] w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
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
            className="focusable absolute right-[-20px] md:right-[-35px] lg:right-[-45px] top-1/2 -translate-y-1/2 z-[60] w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}        {/* Horizontal Scrollable Row - with proper spacing for popup */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-4"
          style={{
            overflowY: 'visible',
            paddingTop: '80px',
            marginTop: '-80px',
            paddingBottom: '80px',
            marginBottom: '-80px'
          }}
        >
          {list.slice(0, 20).map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === Math.min(list.length, 20) - 1;

            return (
              <div
                key={item.id}
                className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] snap-start relative group/card"
                style={{ zIndex: 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
              >
                {/* Poster Card - always visible */}
                <div
                  tabIndex={0}
                  className="focusable w-full aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/card:scale-105"
                  onClick={() => navigate(`/video/${item.id}`)}
                >
                  <img
                    src={item.image || item.signedThumbnailUrl || "/assets/poster.png"}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Floating Popup - expands equally in all directions from center */}
                <div
                  className={`absolute top-1/2 w-[340px] md:w-[380px] opacity-0 scale-90 pointer-events-none group-hover/card:opacity-100 group-hover/card:scale-100 group-hover/card:pointer-events-auto transition-all duration-300 ease-out rounded-xl overflow-visible z-50 ${isFirst
                    ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                    : isLast
                      ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                      : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                    }`}
                >
                  {/* Popup Container with shadow and border */}
                  <div className="relative rounded-xl overflow-hidden bg-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.95)] border border-zinc-700/50">
                    {/* Landscape Thumbnail - tall & prominent */}
                    <div className="w-full h-[180px] md:h-[200px] overflow-hidden relative">
                      <img
                        src={item.image || item.signedThumbnailUrl || "/assets/poster.png"}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                    </div>

                    {/* Details Panel */}
                    <div className="px-4 py-3 flex flex-col gap-2.5">
                      {/* Title */}
                      <p className="text-white font-bold text-[15px] leading-snug">{item.title}</p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); navigate(`/video/${item.id}`); }}
                          className="focusable flex-1 py-2 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-colors"
                        >
                          <Play className="w-4 h-4 fill-current" /> Watch Now
                        </button>
                        <button
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); toggleWatchlist(item.id, item); }}
                          className="focusable w-9 h-9 bg-zinc-800 border border-zinc-600 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow"
                        >
                          {watchlist.includes(item.id.toString()) ? (
                            <Check className="w-4 h-4 text-[#DECB94]" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Metadata */}
                      <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap leading-tight select-none">
                        <span className="text-white font-bold">{item.releaseYear || item.year || 2026}</span>
                        <span className="text-zinc-650">•</span>
                        <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-300">{item.ageRating || item.rating || "U/A"}</span>
                        <span className="text-zinc-650">•</span>
                        <span>{item.seasons && item.seasons.length > 0 ? `${item.seasons.length} Seasons` : (item.duration || "N/A")}</span>
                        {item.language && <><span className="text-zinc-650">•</span><span>{item.language}</span></>}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                        {item.description || "No description available."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {list.length > 20 && (
            <div
              onClick={() => navigate(`/genre/${encodeURIComponent(genreName)}?type=all`)}
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

export const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const mediaItems = useSelector((state: RootState) => state.home.items);
  const mediaStatus = useSelector((state: RootState) => state.home.status);

  const [featuredMovies, setFeaturedMovies] = useState<any[]>([]);
  const [groupedMedia, setGroupedMedia] = useState<Record<string, any[]>>({});
  const isLoading = mediaStatus === "loading" || mediaStatus === "idle";
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Fetch media from Redux
  useEffect(() => {
    if (mediaStatus === "idle") {
      dispatch(fetchHomeMedia());
    }
  }, [mediaStatus, dispatch]);

  // Compute featured and grouped media from Redux state
  useEffect(() => {
    if (mediaItems.length > 0) {
      const featured = mediaItems.filter((item) => item.featured === true).slice(0, 7);
      setFeaturedMovies(filterByUserAge(featured, user?.age ?? null));

      const filteredMedia = filterByUserAge(mediaItems, user?.age ?? null);
      const groups: Record<string, any[]> = {};

      filteredMedia.forEach((item) => {
        if (item.genres && item.genres.length > 0) {
          item.genres.forEach((genre: string) => {
            if (!groups[genre]) {
              groups[genre] = [];
            }
            if (!groups[genre].some((m) => m.id === item.id)) {
              groups[genre].push(item);
            }
          });
        } else {
          const fallback = "Trending";
          if (!groups[fallback]) {
            groups[fallback] = [];
          }
          if (!groups[fallback].some((m) => m.id === item.id)) {
            groups[fallback].push(item);
          }
        }
      });
      setGroupedMedia(groups);
    } else if (mediaStatus === "failed") {
      setFeaturedMovies([]);
    }
  }, [mediaItems, mediaStatus, user?.age]);

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
            image: movieData.image || movieData.signedThumbnailUrl || movieData.thumbnailUrl || "/assets/poster.png",
            category: movieData.category || "Movie",
            year: movieData.releaseYear || movieData.year || "2026",
            rating: movieData.ageRating || movieData.rating || "U/A 13+",
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

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    api.scrollTo(0, true);
    setCurrent(0);

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
      // Collapse expanded state on slide change
      setExpandedMovieId(null);
      setShowFullDescription(false);
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Auto scroll featured hero movies every 6 seconds (pauses when expanded details are open or tab is hidden)
  useEffect(() => {
    if (!api || featuredMovies.length === 0 || expandedMovieId !== null) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (!timer) {
        timer = setInterval(() => {
          api.scrollNext();
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
  }, [api, featuredMovies, expandedMovieId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary text-white w-full overflow-hidden pb-20 md:pb-0">
        <Header />
        <HomePageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary text-white w-full overflow-hidden pb-5 md:pb-0 pt-16 md:pt-0">
      <Header />

      {/* Hero Section Carousel */}
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          duration: 60,
        }}
        className="w-full relative"
      >
        <CarouselContent className="ml-0">
          {featuredMovies.map((movie) => {
            const isExpanded = expandedMovieId === movie.id;
            const titleParts = movie.title.split(":");
            const mainTitle = titleParts[0]?.trim();
            const subTitle = titleParts[1]?.trim();

            return (
              <CarouselItem
                key={movie.id}
                tabIndex={0}
                className="focusable pl-0 relative w-full min-h-[75vh] md:min-h-[88vh] h-auto flex flex-col justify-end cursor-pointer"
                onClick={() => navigate(`/video/${movie.id}`)}
              >
                {/* Age Rating Badge */}
                {movie.ageRating && (
                  <div className="absolute md:top-20 top-7 md:top-8 left-6 md:left-16 z-20 px-3 py-1 bg-black/60 border border-primary-foreground/40 rounded text-xs font-bold text-primary-foreground backdrop-blur-sm select-none">
                    {movie.ageRating}
                  </div>
                )}

                {/* Background Image */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <img
                    src={movie.image}
                    alt={movie.title}
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
                      {movie.title}
                    </h1>

                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#DECB94] mb-6 drop-shadow-md">
                      {movie.tags?.map((tag: string, index: number) => (
                        <div key={tag} className="flex items-center gap-2">
                          <span>{tag}</span>
                          {index < movie.tags.length - 1 && (
                            <span className="w-1 h-1 rounded-full bg-zinc-500" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 w-full pb-4 px-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/video/${movie.id}`);
                        }}
                        className="focusable flex-1 bg-primary hover:bg-white/90 text-[#000000] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm font-bold shadow-md w-full outline-none"
                      >
                        <Play className="w-4 h-4 fill-current text-black" />
                        <span>Play</span>
                      </Button>

                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(movie.id, movie);
                        }}
                        className="focusable flex-1 bg-zinc-900/60 border border-zinc-700 text-[#ffffff] hover:bg-zinc-850 px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full backdrop-blur-sm outline-none"
                      >
                        {watchlist.includes(movie.id.toString()) ? (
                          <Check className="w-4 h-4 mr-1 text-primary" />
                        ) : (
                          <Plus className="w-4 h-4 mr-1 text-primary" />
                        )}
                        <span>{watchlist.includes(movie.id.toString()) ? "In My List" : "My List"}</span>
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
                          <span>{movie.language}</span>
                          <span className="text-zinc-650">|</span>
                          <span>{movie.genres?.join(", ") || movie.tags?.join(", ")}</span>
                        </div>

                        {/* Buttons Row */}
                        <div className="flex items-center gap-4">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/video/${movie.id}`);
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
                              setExpandedMovieId(movie.id);
                            }}
                            className="focusable bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-white px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow backdrop-blur-sm font-bold w-[150px] outline-none"
                          >
                            <span>More Info</span>
                          </Button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(movie.id, movie);
                            }}
                            className="focusable focusable text-white hover:text-white/80 gap-2.5 flex items-center cursor-pointer text-sm font-bold ml-2 transition-colors select-none rounded px-2 py-1 outline-none"
                          >
                            <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                              {watchlist.includes(movie.id.toString()) ? (
                                <Check className="w-3.5 h-3.5 stroke-[3] text-primary" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </div>
                            <span>{watchlist.includes(movie.id.toString()) ? "In My List" : "Add to My List"}</span>
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
                        {/* <div className="flex items-center gap-2 mb-4 text-[10px] tracking-wider text-zinc-400 font-bold select-none">
                          <span className="opacity-60 text-[9px]">CO-PRESENTED BY:</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">LIVEX</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">NITTO</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">TITAN</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">CAMPUS</span>
                        </div> */}

                        {/* Metadata Details Row */}
                        <div className="flex items-center gap-3 text-xs font-bold text-zinc-300 mb-6 select-none">
                          <span>
                            {movie.seasons?.length > 0
                              ? `${movie.seasons.length} Season${movie.seasons.length > 1 ? "s" : ""} ${movie.seasons.reduce((acc: number, s: any) => acc + (s.episodes?.length || 0), 0) || 6} Episodes`
                              : "1 Season 6 Episodes"}
                          </span>
                          <span className="text-zinc-650">|</span>
                          <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-200">{movie.ageRating}</span>
                          <span className="text-zinc-650">|</span>
                          <span>{movie.releaseYear}</span>
                          <span className="text-zinc-650">|</span>
                          <span>{movie.language}</span>
                        </div>

                        {/* Resume / Play & My List Buttons */}
                        <div className="flex items-center gap-4 mb-6">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/video/${movie.id}`);
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
                              toggleWatchlist(movie.id, movie);
                            }}
                            className="focusable bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-[#ffffff] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2.5 text-sm shadow backdrop-blur-sm font-bold outline-none"
                          >
                            <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                              {watchlist.includes(movie.id.toString()) ? (
                                <Check className="w-3 h-3 stroke-[2.5] text-[#DECB94]" />
                              ) : (
                                <Plus className="w-3 h-3 stroke-[2.5]" />
                              )}
                            </div>
                            <span>{watchlist.includes(movie.id.toString()) ? "In My List" : "Add to My List"}</span>
                          </Button>
                        </div>

                        {/* Detailed Description Panel */}
                        <div className="space-y-4 text-left w-full relative">
                          {/* Close Expanded Info */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMovieId(null);
                              setShowFullDescription(false);
                            }}
                            className="focusable focusable absolute -top-12 right-0 p-1.5 bg-zinc-950/80 hover:bg-zinc-800 rounded-full text-white cursor-pointer border border-zinc-800 transition-colors z-30 outline-none"
                            title="Close info panel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <h3 className="text-xl font-extrabold text-white leading-snug">
                            {movie.title}
                          </h3>

                          <div className="space-y-1.5 text-xs font-semibold select-none">
                            <div>
                              <span className="text-zinc-500 font-bold">Genre</span>{" "}
                              <span className="text-zinc-200 ml-2">{movie.genres?.join(", ") || movie.tags?.join(", ")}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 font-bold">Content Descriptor</span>{" "}
                              <span className="text-zinc-200 ml-2">{movie.contentDescriptor}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 font-bold">Publisher</span>{" "}
                              <span className="text-zinc-200 ml-2">{movie.publisher}</span>
                            </div>
                            {movie.cast && movie.cast.length > 0 && (
                              <div>
                                <span className="text-zinc-500 font-bold">Cast</span>{" "}
                                <span className="text-zinc-200 ml-2">
                                  {movie.cast.map((c: any) => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs md:text-sm text-zinc-350 leading-relaxed font-normal mt-4">
                            {showFullDescription ? (
                              <div className="space-y-4 animate-fade-in select-text">
                                {movie.description ? (
                                  movie.description.split("\n").map((p: string, idx: number) => (
                                    <p key={idx}>{p.trim()}</p>
                                  ))
                                ) : (
                                  <p>No description available.</p>
                                )}
                                <button
                                  tabIndex={-1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFullDescription(false);
                                  }}
                                  className="focusable text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors"
                                >
                                  See Less
                                </button>
                              </div>
                            ) : (
                              <div className="animate-fade-in">
                                <p className="line-clamp-3 select-all">{movie.description || "No description available."}</p>
                                {movie.description && movie.description.length > 150 && (
                                  <button
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowFullDescription(true);
                                    }}
                                    className="focusable text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors"
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

        {/* Carousel Dots Indicator - Desktop center bottom */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-1.5 md:pointer-events-none">
          <div className="flex items-center justify-center gap-1.5 md:pointer-events-auto">
            {featuredMovies.map((_, index) => (
              <button
                key={index}
                tabIndex={-1}
                onClick={() => api?.scrollTo(index)}
                className={`focusable h-1.5 text-primary/40 rounded-full transition-all duration-300 ${current === index
                  ? "w-6 bg-primary "
                  : "w-1.5 bg-white/50 hover:bg-white"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Slide Controls (Left, Right arrows, Mute button) - Desktop Right Bottom Corner */}
        <div className="hidden md:flex absolute bottom-6 right-12 z-20 items-center gap-3 select-none">
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              api?.scrollPrev();
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
              api?.scrollNext();
            }}
            className="focusable w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
            aria-label="Next featured banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* <button 
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="focusable w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
            aria-label={isMuted ? "Unmute overview theme" : "Mute overview theme"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button> */}
        </div>
      </Carousel>

      {/* Content Rows */}
      <section className="relative z-20 px-4 md:px-12 space-y-3 mt-1 pb-5 md:pb-5">
        {/* Continue Watching Row */}
        <RecentWatch />

        {/* Trending Now Row */}
        <TrendNow watchlist={watchlist} toggleWatchlist={toggleWatchlist} />

        {/* Recent TV Shows Row */}
        <RecentTVShows watchlist={watchlist} toggleWatchlist={toggleWatchlist} />

        {/* Documentaries Row */}
        <DocumentaryList watchlist={watchlist} toggleWatchlist={toggleWatchlist} />

        {/* Dynamic Genre Rows */}
        {Object.keys(groupedMedia).map((genreName) => {
          const list = groupedMedia[genreName];
          if (list.length === 0) return null;

          return (
            <MediaCategoryRow
              key={genreName}
              genreName={genreName}
              list={list}
              navigate={navigate}
              toggleWatchlist={toggleWatchlist}
              watchlist={watchlist}
            />
          );
        })}
      </section>
    </div>
  );
};