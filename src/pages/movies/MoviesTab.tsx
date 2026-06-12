import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { ChevronLeft, ChevronRight, Bookmark, Share2, Play, Plus, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getMatchingData, getSignedUrl, compoundQuery, deleteDocument, createDocument } from '@/Firebase';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Header from '@/components/Header';
import TrendNow from '../HomePage/TrendNow';

interface MovieItem {
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

const MoviesTabSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-24 px-4 animate-pulse">
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero banner skeleton */}
      <div className="w-full h-[50vh] md:h-[65vh] bg-zinc-950 rounded-lg" />

      {/* Dynamic categories skeleton */}
      {[1, 2].map((categoryIdx) => (
        <div key={categoryIdx} className="space-y-4">
          <Skeleton className="h-6 w-40 bg-zinc-900 rounded" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-[140px] sm:w-[170px] md:w-[200px] aspect-[2/3] rounded-md bg-zinc-900 shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MovieCategoryRow = ({
  genreName,
  list,
  navigate,
  isTrending = false
}: {
  genreName: string;
  list: MovieItem[];
  navigate: ReturnType<typeof useNavigate>;
  isTrending?: boolean;
}) => {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const displayList = isTrending ? list.slice(0, 10) : list;

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
      row.addEventListener('scroll', updateScrollButtons);
      // Run once initially
      updateScrollButtons();

      // Also listen to resize
      window.addEventListener('resize', updateScrollButtons);

      // Wait a bit for image rendering and layout calculations
      const timer = setTimeout(updateScrollButtons, 500);

      return () => {
        row.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
        clearTimeout(timer);
      };
    }
  }, [list]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      rowRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
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
            onClick={() => handleScroll('left')}
            className="absolute left-[-20px] md:left-[-35px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Scroll Button */}
        {showRight && (
          <button
            onClick={() => handleScroll('right')}
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
          {displayList.map((movie) => {
            // Normal Movie Row Item
            return (
              <div
                key={movie.id}
                className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-zinc-900 bg-zinc-950 snap-start"
                onClick={() => navigate(`/video/${movie.id}`)}
              >
                <img
                  src={movie.signedThumbnailUrl || "/assets/poster.png"}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] group-hover:brightness-[0.4] transition-all duration-300"
                />

                {/* Mobile Title bar fallback (Visible when not hovered on touch devices) */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300 md:hidden z-1">
                  <p className="text-sm font-semibold text-white truncate text-center drop-shadow-md">
                    {movie.title}
                  </p>
                </div>

                {/* The theatrical hover details overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">

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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/video/${movie.id}`);
                      }}
                      className="flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs md:text-sm rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                    >
                      Play Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
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

const MoviesTab = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;

  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [groupedMovies, setGroupedMovies] = useState<Record<string, MovieItem[]>>({});

  // Featured hero carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedMovieId, setExpandedMovieId] = useState<string | null>(null);
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
            category: movieData.category || "Movie",
            year: movieData.releaseYear || "2026",
            rating: movieData.ageRating || "U/A 13+",
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

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        const fetchedMovies = await getMatchingData("media", "category", "==", "Movie");

        const signedMovies = await Promise.all(
          fetchedMovies.map(async (movie) => {
            let signedThumb = movie.thumbnailUrl || "";
            if (signedThumb) {
              try {
                signedThumb = await getSignedUrl(movie.thumbnailUrl);
              } catch (err) {
                console.error("Error signing URL:", err);
              }
            }
            return {
              ...movie,
              signedThumbnailUrl: signedThumb
            } as MovieItem;
          })
        );

        setMovies(signedMovies);
      } catch (error) {
        console.error("Error fetching movies from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Dynamically group movies by genre
  useEffect(() => {
    if (movies.length === 0) return;

    const groups: Record<string, MovieItem[]> = {};

    movies.forEach((movie) => {
      if (movie.genres && movie.genres.length > 0) {
        movie.genres.forEach((genre) => {
          if (!groups[genre]) {
            groups[genre] = [];
          }
          if (!groups[genre].some(m => m.id === movie.id)) {
            groups[genre].push(movie);
          }
        });
      } else {
        const fallback = "Trending Movies";
        if (!groups[fallback]) {
          groups[fallback] = [];
        }
        if (!groups[fallback].some(m => m.id === movie.id)) {
          groups[fallback].push(movie);
        }
      }
    });

    if (!groups["Trending Now"]) {
      groups["Trending Now"] = movies;
    }

    setGroupedMovies(groups);
  }, [movies]);

  // Synchronize carousel slide snaps
  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.scrollTo(0, true);
    setCurrentSlide(0);

    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
      // Collapse expanded state on slide change
      setExpandedMovieId(null);
      setShowFullDescription(false);
    };

    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi]);

  // Auto scroll featured hero movies every 6 seconds (pauses when expanded details are open or tab is hidden)
  useEffect(() => {
    if (!carouselApi || movies.length === 0 || expandedMovieId !== null) return;

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
  }, [carouselApi, movies, expandedMovieId]);

  const featuredList = movies.slice(0, 4);

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 relative pt-16 md:pt-0">
      <Header />

      {isLoading ? (
        <MoviesTabSkeleton />
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
                {featuredList.map((slide) => {
                  const isExpanded = expandedMovieId === slide.id;
                  const titleParts = slide.title.split(":");
                  const mainTitle = titleParts[0]?.trim();
                  const subTitle = titleParts[1]?.trim();
                  const tags = slide.genres && slide.genres.length > 0
                    ? slide.genres
                    : (slide.category ? [slide.category] : ["Featured", "Trending"]);

                  return (
                    <CarouselItem
                      key={slide.id}
                      className="pl-0 relative w-full min-h-[75vh] md:min-h-[88vh] h-auto flex flex-col justify-end cursor-pointer"
                      onClick={() => navigate(`/video/${slide.id}`)}
                    >
                      {/* Age Rating Badge */}
                      {slide.ageRating && (
                        <div className="absolute md:top-20 top-7 md:top-8 left-6 md:left-16 z-20 px-3 py-1 bg-black/60 border border-primary-foreground/40 rounded text-xs font-bold text-primary-foreground backdrop-blur-sm select-none">
                          {slide.ageRating}
                        </div>
                      )}

                      {/* Background Image */}
                      <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <img
                          src={slide.signedThumbnailUrl || "/assets/poster.png"}
                          alt={slide.title}
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
                            {slide.title}
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
                                navigate(`/video/${slide.id}`);
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
                                toggleWatchlist(slide.id, slide);
                              }}
                              className="flex-1 bg-zinc-900/60 border border-zinc-700 text-[#ffffff] hover:bg-zinc-850 px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full backdrop-blur-sm"
                            >
                              <Plus className="w-4 h-4 mr-1 text-[#DECB94]" />
                              <span>{watchlist.includes(slide.id.toString()) ? "In My List" : "My List"}</span>
                            </Button>
                          </div>
                        </div>

                        {/* DESKTOP WEB LAYOUT */}
                        <div className="hidden md:block w-full">
                          {!isExpanded ? (
                            /* Compact Desktop Layout */
                            <div className="flex flex-col items-start text-left max-w-2xl animate-fade-in relative z-20">
                              {/* Featured Movie Badge */}
                              <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white px-2.5 py-0.5 rounded uppercase tracking-widest mb-3">
                                Featured Movie
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
                                <span>{slide.language || "English"}</span>
                                <span className="text-zinc-650">|</span>
                                <span>{slide.genres?.join(", ") || tags.join(", ")}</span>
                              </div>

                              {/* Buttons Row */}
                              <div className="flex items-center gap-4">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/video/${slide.id}`);
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
                                    setExpandedMovieId(slide.id);
                                  }}
                                  className="bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-white px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow backdrop-blur-sm font-bold w-[150px]"
                                >
                                  <span>More Info</span>
                                </Button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(slide.id, slide);
                                  }}
                                  className="text-white hover:text-white/80 gap-2.5 flex items-center cursor-pointer text-sm font-bold ml-2 transition-colors select-none"
                                >
                                  <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                                    {watchlist.includes(slide.id.toString()) ? (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                  </div>
                                  <span>{watchlist.includes(slide.id.toString()) ? "In My List" : "Add to My List"}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Expanded Desktop Layout */
                            <div className="flex flex-col items-start text-left max-w-2xl animate-fade-in relative z-20 select-text pb-6 md:pb-8">
                              {/* Featured Movie Badge */}
                              <span className="text-[10px] font-bold bg-white/10 border border-white/20 text-white px-2.5 py-0.5 rounded uppercase tracking-widest mb-3">
                                Featured Movie
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
                                <span>{slide.duration || "N/A"}</span>
                                <span className="text-zinc-650">|</span>
                                <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] text-zinc-200">{slide.ageRating || "U/A 13+"}</span>
                                <span className="text-zinc-650">|</span>
                                <span>{slide.releaseYear || "2026"}</span>
                                <span className="text-zinc-650">|</span>
                                <span>{slide.language || "English"}</span>
                              </div>

                              {/* Resume / Play & My List Buttons */}
                              <div className="flex items-center gap-4 mb-6">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/video/${slide.id}`);
                                  }}
                                  className="bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
                                >
                                  <Play className="w-4 h-4 fill-current text-black" />
                                  <span>Play</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(slide.id, slide);
                                  }}
                                  className="bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-[#ffffff] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2.5 text-sm shadow backdrop-blur-sm font-bold"
                                >
                                  <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white shrink-0">
                                    {watchlist.includes(slide.id.toString()) ? (
                                      <Check className="w-3 h-3 stroke-[2.5]" />
                                    ) : (
                                      <Plus className="w-3 h-3 stroke-[2.5]" />
                                    )}
                                  </div>
                                  <span>{watchlist.includes(slide.id.toString()) ? "In My List" : "Add to My List"}</span>
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
                                  {slide.title}
                                </h3>

                                <div className="space-y-1.5 text-xs font-semibold select-none">
                                  <div>
                                    <span className="text-zinc-500 font-bold">Genre</span>{" "}
                                    <span className="text-zinc-200 ml-2">{slide.genres?.join(", ") || tags.join(", ")}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 font-bold">Content Descriptor</span>{" "}
                                    <span className="text-zinc-200 ml-2">{slide.contentDescriptor || "General Audience"}</span>
                                  </div>
                                  <div>
                                    <span className="text-zinc-500 font-bold">Publisher</span>{" "}
                                    <span className="text-zinc-200 ml-2">{slide.publisher || "AVR Cinema Pictures"}</span>
                                  </div>
                                  {slide.cast && slide.cast.length > 0 && (
                                    <div>
                                      <span className="text-zinc-500 font-bold">Cast</span>{" "}
                                      <span className="text-zinc-200 ml-2">
                                        {slide.cast.map((c: any) => typeof c === 'string' ? c : (c.name || '')).filter(Boolean).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-xs md:text-sm text-zinc-350 leading-relaxed font-normal mt-4">
                                  {showFullDescription ? (
                                    <div className="space-y-4 animate-fade-in select-text">
                                      {slide.description ? (
                                        slide.description.split("\n").map((p: string, idx: number) => (
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
                                      <p className="line-clamp-3 select-all">{slide.description || "No description available."}</p>
                                      {slide.description && slide.description.length > 150 && (
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

              {/* Slider Dots indicators */}
              <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-1.5 md:pointer-events-none">
                <div className="flex items-center justify-center gap-1.5 md:pointer-events-auto">
                  {featuredList.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => carouselApi?.scrollTo(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === index
                        ? "w-6 bg-primary"
                        : "w-2 bg-zinc-650 hover:bg-zinc-400"
                        }`}
                    />
                  ))}
                </div>
              </div>
            </Carousel>
          )}

          {/* Dynamic Category Sliders */}
          <div className="px-4 md:px-12 lg:px-16 pt-5 md:pt-10 pb-16 md:pb-24 space-y-5 md:space-y-10 w-full  mx-auto">
            {Object.keys(groupedMovies).map((genreName) => {
              const list = groupedMovies[genreName];
              if (list.length === 0) return null;

              const isTrendingRow = genreName === "Trending Now" || genreName === "Trending Movies" || genreName === "Trending";
              if (isTrendingRow) {
                return <TrendNow key={genreName} />;
              }

              return (
                <MovieCategoryRow
                  key={genreName}
                  genreName={genreName}
                  list={list}
                  navigate={navigate}
                  isTrending={false}
                />
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};

export default MoviesTab;
