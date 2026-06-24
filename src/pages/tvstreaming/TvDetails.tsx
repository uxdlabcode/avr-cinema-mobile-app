import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { Play, ChevronRight, ChevronDown, ChevronLeft, Plus, Check, X, Volume2, VolumeX, Tv, Film } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { compoundQuery, deleteDocument, createDocument } from '@/Firebase';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { fetchTvMedia } from '@/store/slices/tvSlice';
import Header from '@/components/Header';
import RecentTVShows from './Episode';
import DocumentaryList from './DocumentaryList';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';

interface TvShowItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  duration?: string;
  releaseYear?: number;
  category?: string;
  rating?: string;
  [key: string]: any;
}

// Static Data
const TABS = ['For You', 'TV Shows', 'Documentaries'];

const TV_GUIDE_DAYS = ['YESTERDAY', 'TODAY', 'TOMORROW'];

const LIVE_CHANNELS = [
  { id: 1, name: 'StarGOLD', logo: '/assets/cast1.webp', color: 'from-red-600 to-yellow-500' },
  { id: 2, name: 'Sony TV', logo: '/assets/cast2.webp', color: 'from-blue-700 to-blue-500' },
  { id: 3, name: 'Star Sports', logo: '/assets/cast3.jpg', color: 'from-red-700 to-orange-500' },
  { id: 4, name: 'Sports Net', logo: '/assets/cast1.webp', color: 'from-green-600 to-teal-500' },
  { id: 5, name: 'News Live', logo: '/assets/cast2.webp', color: 'from-purple-700 to-purple-500' },
];



const MediaCategoryRow = ({
  genreName,
  list,
  navigate,
  watchlist = [],
  toggleWatchlist,
}: {
  genreName: string;
  list: any[];
  navigate: ReturnType<typeof useNavigate>;
  watchlist?: string[];
  toggleWatchlist?: (movieId: string, movieData: any) => Promise<void>;
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
            className="focusable absolute right-[-20px] md:right-[-35px] lg:left-[-45px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Horizontal Scrollable Row - overflow-visible so popup can escape */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto overflow-y-visible pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-4"
          style={{ overflowY: 'visible' }}
        >
          {list.map((item) => (
            <div
              key={item.id}
              className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] snap-start relative group/card"
              style={{ zIndex: 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
              onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
            >
              {/* Poster Card */}
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

              {/* Floating Popup */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto transition-all duration-200 rounded-xl overflow-hidden bg-zinc-900 shadow-2xl shadow-black/80 border border-zinc-700/80 z-50">
                {/* Landscape Thumbnail */}
                <div className="w-full aspect-video overflow-hidden relative">
                  <img
                    src={item.image || item.signedThumbnailUrl || "/assets/poster.png"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-lg">{item.title}</p>
                  </div>
                </div>

                {/* Details Panel */}
                <div className="p-3 flex flex-col gap-2.5">
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); navigate(`/video/${item.id}`); }}
                      className="focusable flex-1 py-1.5 bg-white text-black hover:bg-zinc-200 rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Now
                    </button>
                    <button
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); if (toggleWatchlist) toggleWatchlist(item.id, item); }}
                      className="focusable w-8 h-8 bg-zinc-800 border border-zinc-700 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow"
                    >
                      {watchlist.includes(item.id.toString()) ? (
                        <Check className="w-3.5 h-3.5 text-[#DECB94]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 flex-wrap leading-tight select-none">
                    <span className="text-white">{item.releaseYear || item.year || 2026}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="px-1 border border-zinc-600 rounded text-[9px] leading-snug py-0.5 text-zinc-300">{item.ageRating || item.rating || "U/A"}</span>
                    <span className="text-zinc-600">•</span>
                    <span>{item.seasons && item.seasons.length > 0 ? `${item.seasons.length} Seasons` : (item.duration || "N/A")}</span>
                    {item.language && <><span className="text-zinc-600">•</span><span>{item.language}</span></>}
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-zinc-400 line-clamp-4 leading-relaxed">
                    {item.description || "No description available."}
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

const TvDetails = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const mediaItems = useSelector((state: RootState) => state.tv.items);
  const mediaStatus = useSelector((state: RootState) => state.tv.status);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'For You';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [activeDay, setActiveDay] = useState('TODAY');
  const isLoading = mediaStatus === "loading" || mediaStatus === "idle";
  const [tvShows, setTvShows] = useState<TvShowItem[]>([]);
  const [groupedTvAndDocs, setGroupedTvAndDocs] = useState<Record<string, any[]>>({});
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState(true);

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
      dispatch(fetchTvMedia());
    }
  }, [mediaStatus, dispatch]);

  useEffect(() => {
    if (mediaItems.length > 0) {
      // 1. TV Shows for hero banner
      const shows = mediaItems.filter(item => item.category === "TV Show") as TvShowItem[];
      setTvShows(shows);

      // 2. Group TV Shows and Documentaries
      const tvAndDocs = mediaItems.filter(
        item => item.category === "TV Show" || item.category === "Documentary"
      );
      const groups: Record<string, any[]> = {};
      tvAndDocs.forEach((item) => {
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
      setGroupedTvAndDocs(groups);
    }
  }, [mediaItems]);

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

    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
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

  const featuredShows = tvShows.slice(0, 4);

  return (
    <div className="min-h-screen bg-black text-white w-full pb-14 md:pb-0 pt-16 md:pt-0">
      <Header />

      {/* Tab Navigation */}
      <div className="sticky top-14 md:top-0 z-40 bg-black flex gap-6 px-4 md:py-3 overflow-x-auto md:pt-5 md:mt-7 scrollbar-hide border-b border-zinc-900">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`focusable focusable pb-2 text-xs md:text-lg lg:text-sm font-semibold  transition-colors relative whitespace-nowrap outline-none focus:bg-zinc-850 rounded px-2 ${activeTab === tab
              ? 'text-primary'
              : 'text-zinc-400 hover:text-white'
              }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
          </button>
        ))}
      </div>

      {/* Loading Skeletons */}
      {isLoading && activeTab === 'For You' && (
        <div className="animate-pulse space-y-5 pt-4 pb-6">
          {/* Hero Banner Skeleton — matches min-h-[75vh] md:min-h-[88vh] */}
          <div className="relative w-full min-h-[55vh] md:min-h-[88vh] flex flex-col justify-end">
            <Skeleton className="absolute inset-0 w-full h-full bg-zinc-900 rounded-none" />
            {/* Mobile hero overlay */}
            <div className="md:hidden relative z-10 flex flex-col items-center text-center px-4 pb-10 gap-3">
              <Skeleton className="h-8 w-3/4 bg-zinc-800 rounded" />
              <Skeleton className="h-4 w-1/2 bg-zinc-700 rounded" />
              <div className="flex gap-3 w-full mt-1">
                <Skeleton className="flex-1 h-12 rounded-md bg-zinc-800" />
                <Skeleton className="flex-1 h-12 rounded-md bg-zinc-800" />
              </div>
            </div>
            {/* Desktop hero overlay */}
            <div className="hidden md:flex relative z-10 flex-col items-start px-16 pb-20 gap-3 max-w-2xl">
              <Skeleton className="h-5 w-24 bg-zinc-800 rounded" />
              <Skeleton className="h-14 w-80 bg-zinc-800 rounded" />
              <Skeleton className="h-5 w-48 bg-zinc-700 rounded" />
              <div className="flex items-center gap-4 mt-3">
                <Skeleton className="h-12 w-36 rounded-md bg-zinc-800" />
                <Skeleton className="h-12 w-36 rounded-md bg-zinc-800" />
              </div>
            </div>
          </div>

          {/* Popular TV Shows skeleton — matches w-48 md:w-56 aspect-video landscape cards */}
          <div className="px-4 space-y-3">
            <Skeleton className="h-5 w-44 rounded bg-zinc-800" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="shrink-0 w-48 md:w-56 aspect-video rounded-lg bg-zinc-900" />
              ))}
            </div>
          </div>

          {/* Documentaries row skeleton — matches portrait cards from DocumentaryList */}
          <div className="px-4 space-y-3">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-zinc-700" />
              <Skeleton className="h-6 w-32 bg-zinc-800 rounded" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className="shrink-0 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && activeTab === 'TV Shows' && (
        <div className="px-4 pt-6 space-y-8 w-full text-left animate-pulse">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Tv className="w-4 h-4 text-zinc-700" />
              <Skeleton className="h-6 w-32 bg-zinc-800" />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 pb-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-full aspect-[2/3] rounded-md bg-zinc-900"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && activeTab === 'Documentaries' && (
        <div className="px-4 pt-6 space-y-8 w-full text-left animate-pulse">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Film className="w-4 h-4 text-zinc-700" />
              <Skeleton className="h-6 w-32 bg-zinc-800" />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 pb-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-full aspect-[2/3] rounded-md bg-zinc-900"
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {/* If loading completed and no media items exist in the TV section */}
      {!isLoading && mediaItems.length === 0 && (
        <div className="px-4 py-12">
          <Empty className="py-20 border border-dashed border-zinc-805/40 bg-zinc-950/25 rounded-2xl">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-primary/10 text-primary animate-pulse">
                <Tv className="w-6 h-6 text-primary" />
              </EmptyMedia>
              <EmptyTitle className="text-white font-semibold text-lg">No data added yet</EmptyTitle>
              <EmptyDescription className="text-zinc-500 max-w-[340px] mx-auto text-xs">
                We couldn't find any TV shows or documentaries in this section.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {mediaItems.length > 0 && (
        <>
          {/* Hero Carousel (FOR YOU tab) */}
          {activeTab === 'For You' && featuredShows.length > 0 && (
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
                {featuredShows.map((slide) => {
                  const isExpanded = expandedShowId === slide.id;
                  const titleParts = slide.title.split(":");
                  const mainTitle = titleParts[0]?.trim();
                  const subTitle = titleParts[1]?.trim();
                  const tags = slide.genres && slide.genres.length > 0
                    ? slide.genres
                    : (slide.category ? [slide.category] : ["Featured", "Trending"]);

                  return (
                    <CarouselItem
                      key={slide.id}
                      tabIndex={-1}
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
                              className="focusable flex-1 bg-[#ffffff] hover:bg-white/90 text-[#000000] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm font-bold shadow-md w-full"
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
                              className="focusable flex-1 bg-zinc-900/60 border border-zinc-700 text-[#ffffff] hover:bg-zinc-850 px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-full backdrop-blur-sm"
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
                                  className="focusable bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-[150px]"
                                >
                                  <Play className="w-4 h-4 fill-current text-black" />
                                  <span>Play</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedShowId(slide.id);
                                  }}
                                  className="focusable bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-white px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow backdrop-blur-sm font-bold w-[150px]"
                                >
                                  <span>More Info</span>
                                </Button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(slide.id, slide);
                                  }}
                                  className="focusable focusable text-white hover:text-white/80 gap-2.5 flex items-center cursor-pointer text-sm font-bold ml-2 transition-colors select-none"
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
                                  {slide.seasons?.length > 0
                                    ? `${slide.seasons.length} Season${slide.seasons.length > 1 ? "s" : ""} ${slide.seasons.reduce((acc: number, s: any) => acc + (s.episodes?.length || 0), 0) || 6} Episodes`
                                    : "1 Season 6 Episodes"}
                                </span>
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
                                  className="focusable bg-white hover:bg-white/90 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
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
                                  className="focusable bg-zinc-950/60 hover:bg-zinc-900/80 border border-zinc-800 text-[#ffffff] px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2.5 text-sm shadow backdrop-blur-sm font-bold"
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
                                    setExpandedShowId(null);
                                    setShowFullDescription(false);
                                  }}
                                  className="focusable focusable absolute -top-12 right-0 p-1.5 bg-zinc-950/80 hover:bg-zinc-800 rounded-full text-white cursor-pointer border border-zinc-800 transition-colors z-30"
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
                                    <span className="text-zinc-200 ml-2">{slide.publisher || "Almighty Motion Picture"}</span>
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
                                        className="focusable focusable text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors"
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
                                          className="focusable focusable text-white hover:text-white/80 font-bold flex items-center gap-1 mt-2 cursor-pointer transition-colors"
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
                  {featuredShows.map((_, index) => (
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

          {/* Popular TV Shows */}
          {activeTab === 'For You' && tvShows.length > 0 && (
            <section className="px-4 pt-6 space-y-3">
              <h2
                tabIndex={-1}
                className="text-base font-bold flex items-center text-white cursor-pointer hover:text-primary transition-colors"
                onClick={() => setActiveTab('TV Shows')}
              >
                Popular TV Shows <ChevronRight className="w-4 h-4 ml-1" />
              </h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
                {tvShows.map((show) => (
                  <div
                    key={show.id}
                    tabIndex={0}
                    className="focusable relative shrink-0 w-48 md:w-56 aspect-video rounded-lg overflow-hidden snap-start cursor-pointer group outline-none"
                    onClick={() => navigate(`/video/${show.id}`)}
                  >
                    <img src={show.signedThumbnailUrl || "/assets/poster.png"} alt={show.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 z-10">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-semibold text-white truncate">{show.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documentaries in FOR YOU tab */}
          {activeTab === 'For You' && (
            <div className="px-4 pb-6">
              <DocumentaryList watchlist={watchlist} toggleWatchlist={toggleWatchlist} />
            </div>
          )}

          {/* Dynamic Genre Rows (TV Shows and Documentaries) */}
          {activeTab === 'For You' && (
            <div className="px-4 pb-8 space-y-8">
              {Object.keys(groupedTvAndDocs).map((genreName) => {
                const list = groupedTvAndDocs[genreName];
                if (list.length === 0) return null;

                return (
                  <MediaCategoryRow
                    key={genreName}
                    genreName={genreName}
                    list={list}
                    navigate={navigate}
                    watchlist={watchlist}
                    toggleWatchlist={toggleWatchlist}
                  />
                );
              })}
            </div>
          )}

          {/* TV Shows Tab */}
          {activeTab === 'TV Shows' && (
            <div className="px-4 pt-6">
              <RecentTVShows isGrid={true} watchlist={watchlist} toggleWatchlist={toggleWatchlist} />
            </div>
          )}

          {/* Documentaries Tab */}
          {activeTab === 'Documentaries' && (
            <div className="px-4 pt-6">
              <DocumentaryList isGrid={true} watchlist={watchlist} toggleWatchlist={toggleWatchlist} />
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default TvDetails;
