import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus, ChevronRight, ChevronLeft, Volume2, VolumeX, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { compoundQuery, getSignedUrl, deleteDocument, createDocument, getCollectionData } from "@/Firebase";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
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
    description: "Wrongfully suspended while pursuing the culprit in a missing persons case, a cop seeks redemption – and justice – when he gets a new assignment.",
    category: "Movie",
    releaseYear: "2024",
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
    description: "A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth.",
    category: "Movie",
    releaseYear: "2001",
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
      <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide">
        {genreName}
      </h3>

      <div className="relative w-full">
        {/* Left Scroll Button */}
        {showLeft && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-[-20px] md:left-[-35px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRight && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-[-20px] md:right-[-35px] lg:right-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scrollable Row */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-4"
        >
          {list.map((item) => (
            <div
              key={item.id}
              className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-zinc-900 bg-zinc-950 snap-start"
              onClick={() => navigate(`/video/${item.id}`)}
            >
              <img
                src={item.image || "/assets/poster.png"}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] group-hover:brightness-[0.4] transition-all duration-300"
              />

              {/* Mobile Title bar fallback */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300 md:hidden z-1">
                <p className="text-sm font-semibold text-white truncate text-center drop-shadow-md">
                  {item.title}
                </p>
              </div>

              {/* Hover details overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                {/* Category/Genre Badge */}
                <div className="flex justify-end mb-1 md:mb-2">
                  <span className="text-[8px] md:text-[9px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {item.category || (item.genres && item.genres.length > 0 ? item.genres[0] : "Media")}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs md:text-sm font-bold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                  {item.title}
                </h4>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-[8px] md:text-[9px] font-semibold text-zinc-400 mb-1.5 md:mb-2.5">
                  <span className="truncate">{item.language || "English"}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[8px] md:text-[9px] opacity-85">🌐</span>
                    <span>{item.duration || "N/A"}</span>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center gap-1 md:gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/video/${item.id}`);
                    }}
                    className="flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs md:text-sm rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                  >
                    Play Now
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(item.id, item);
                    }}
                    className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                  >
                    {watchlist.includes(item.id.toString()) ? (
                      <Check className="w-3 h-3 text-[#DECB94]" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const HomePage = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;

  const [featuredMovies, setFeaturedMovies] = useState<any[]>([]);
  const [groupedMedia, setGroupedMedia] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Load featured movies and all media grouped by genres in parallel
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. Fetch featured movies
        const fetchFeaturedPromise = (async () => {
          try {
            const docs = await compoundQuery("media", [
              { key: "featured", operator: "==", value: true },
            ]);

            const sorted = (docs || [])
              .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
                const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
                return timeB - timeA;
              })
              .slice(0, 7);

            const enriched = await Promise.all(
              sorted.map(async (doc) => {
                let image = "/assets/poster.png";
                if (doc.thumbnailUrl) {
                  try {
                    image = await getSignedUrl(doc.thumbnailUrl);
                  } catch {
                    image = doc.thumbnailUrl;
                  }
                }
                return {
                  id: doc.id,
                  title: doc.title,
                  image: image,
                  description: doc.description || "Wrongfully suspended while pursuing the culprit in a missing persons case, a cop seeks redemption – and justice – when he gets a new assignment.",
                  category: doc.category || "Movie",
                  releaseYear: doc.releaseYear || doc.year || "2026",
                  ageRating: doc.ageRating || doc.rating || "U/A 13+",
                  language: doc.language || "Hindi",
                  publisher: doc.publisher || "Almighty Motion Picture",
                  contentDescriptor: doc.contentDescriptor || "foul language, tobacco depictions, alcohol use",
                  seasons: doc.seasons || [],
                  genres: doc.genres || [],
                  tags: doc.genres && doc.genres.length > 0 ? doc.genres : (doc.category ? [doc.category] : ["Featured", "Trending"]),
                  cast: doc.cast || [],
                };
              })
            );

            setFeaturedMovies(enriched.length > 0 ? enriched : fallbackData);
          } catch (err) {
            console.error("Error fetching featured movies", err);
            setFeaturedMovies(fallbackData);
          }
        })();

        // 2. Fetch all media and group by genres
        const fetchAllMediaPromise = (async () => {
          try {
            const docs = await getCollectionData("media");

            const sorted = (docs || [])
              .sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
                const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
                return timeB - timeA;
              });

            const enriched = await Promise.all(
              sorted.map(async (doc) => {
                let image = "/assets/poster.png";
                if (doc.thumbnailUrl) {
                  try {
                    image = await getSignedUrl(doc.thumbnailUrl);
                  } catch {
                    image = doc.thumbnailUrl;
                  }
                }
                return {
                  id: doc.id,
                  title: doc.title,
                  image: image,
                  description: doc.description || "",
                  category: doc.category || "Movie",
                  releaseYear: doc.releaseYear || doc.year || "2026",
                  ageRating: doc.ageRating || doc.rating || "U/A 13+",
                  language: doc.language || "Hindi",
                  publisher: doc.publisher || "",
                  contentDescriptor: doc.contentDescriptor || "",
                  seasons: doc.seasons || [],
                  genres: doc.genres || [],
                  cast: doc.cast || [],
                  duration: doc.duration || "N/A"
                };
              })
            );

            // Group by genre
            const groups: Record<string, any[]> = {};
            enriched.forEach((item) => {
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
          } catch (err) {
            console.error("Error fetching all media for genre grouping", err);
          }
        })();

        await Promise.all([fetchFeaturedPromise, fetchAllMediaPromise]);
      } catch (err) {
        console.error("Error loading homepage data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
            image: movieData.image,
            category: movieData.category,
            year: movieData.releaseYear,
            rating: movieData.ageRating,
            duration: movieData.duration || "N/A"
          };
          await createDocument("my_list", docId, payload);
          setWatchlist(prev => [...prev, movieId.toString()]);
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
        } else {
          updatedList = [...localList, movieId.toString()];
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

  // Auto scroll featured hero movies every 3 seconds (pauses when expanded details are open)
  useEffect(() => {
    if (!api || featuredMovies.length === 0 || expandedMovieId !== null) return;
    const timer = setInterval(() => {
      api.scrollNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [api, featuredMovies, expandedMovieId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white w-full overflow-hidden pb-20 md:pb-0">
        <Header />
        <HomePageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white w-full overflow-hidden pb-20 md:pb-0">
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
                className="pl-0 relative w-full min-h-[75vh] md:min-h-[88vh] h-auto flex flex-col justify-end cursor-pointer"
                onClick={() => navigate(`/video/${movie.id}`)}
              >
                {/* Age Rating Badge */}
                {movie.ageRating && (
                  <div className="absolute top-20 md:top-8 left-6 md:left-16 z-20 px-3 py-1 bg-black/60 border border-primary-foreground/40 rounded text-xs font-bold text-primary-foreground backdrop-blur-sm select-none">
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
                  {/* Left Gradient Overlay - darker for reading text details on desktop */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${isExpanded
                      ? "from-black via-black/95 to-black/20"
                      : "from-black via-black/80 md:via-black/50 to-transparent"
                    } z-[1] transition-all duration-500`} />

                  {/* Top Gradient Overlay */}
                  <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/85 to-transparent z-[1]" />

                  {/* Bottom Gradient Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black via-black/90 to-transparent z-[1]" />
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
                        className="flex-1 bg-[#ffffff] hover:bg-white/90 text-[#000000] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm font-bold shadow-md w-full"
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
                        className="flex-1 bg-zinc-900/60 border border-zinc-700 text-[#ffffff] hover:bg-zinc-850 px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full backdrop-blur-sm"
                      >
                        <Plus className="w-4 h-4 mr-1 text-[#DECB94]" />
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
                            className="bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-[150px]"
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
                            className="bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-white px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow backdrop-blur-sm font-bold w-[150px]"
                          >
                            <span>More Info</span>
                          </Button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(movie.id, movie);
                            }}
                            className="text-white hover:text-white/80 gap-2.5 flex items-center cursor-pointer text-sm font-bold ml-2 transition-colors select-none"
                          >
                            <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
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
                        <div className="flex items-center gap-2 mb-4 text-[10px] tracking-wider text-zinc-400 font-bold select-none">
                          <span className="opacity-60 text-[9px]">CO-PRESENTED BY:</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">LIVEX</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">NITTO</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">TITAN</span>
                          <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm text-white font-extrabold tracking-widest text-[9px]">CAMPUS</span>
                        </div>

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
                            className="bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
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
                            className="bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-[#ffffff] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2.5 text-sm shadow backdrop-blur-sm font-bold"
                          >
                            <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                              <Plus className="w-3 h-3 stroke-[2.5]" />
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
                            className="absolute -top-12 right-0 p-1.5 bg-zinc-950/80 hover:bg-zinc-800 rounded-full text-white cursor-pointer border border-zinc-800 transition-colors z-30"
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFullDescription(false);
                                  }}
                                  className="text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors"
                                >
                                  See Less
                                </button>
                              </div>
                            ) : (
                              <div className="animate-fade-in">
                                <p className="line-clamp-3 select-all">{movie.description || "No description available."}</p>
                                {movie.description && movie.description.length > 150 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowFullDescription(true);
                                    }}
                                    className="text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors"
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
                onClick={() => api?.scrollTo(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${current === index
                  ? "w-6 bg-white animate-pulse"
                  : "w-1.5 bg-zinc-650 hover:bg-zinc-400"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Slide Controls (Left, Right arrows, Mute button) - Desktop Right Bottom Corner */}
        <div className="hidden md:flex absolute bottom-6 right-12 z-20 items-center gap-3 select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              api?.scrollPrev();
            }}
            className="w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
            aria-label="Previous featured banner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              api?.scrollNext();
            }}
            className="w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
            aria-label="Next featured banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="w-10 h-10 rounded-full bg-zinc-950/70 hover:bg-zinc-800 text-white flex items-center justify-center cursor-pointer border border-zinc-850 backdrop-blur-sm transition-colors shadow-md"
            aria-label={isMuted ? "Unmute overview theme" : "Mute overview theme"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </Carousel>

      {/* Content Rows */}
      <section className="relative z-20 px-4 md:px-12 space-y-8 mt-2 pb-24 md:pb-8">
        {/* Continue Watching Row */}
        <RecentWatch />

        {/* Trending Now Row */}
        <TrendNow />

        {/* Recent TV Shows Row */}
        <RecentTVShows />

        {/* Documentaries Row */}
        <DocumentaryList />

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