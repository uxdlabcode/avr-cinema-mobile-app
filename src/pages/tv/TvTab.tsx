import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Share2,
  Play,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMatchingData, getSignedUrl } from "@/Firebase";
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
              <Skeleton
                key={i}
                className="w-[140px] sm:w-[170px] md:w-[200px] aspect-[2/3] rounded-md bg-zinc-900 shrink-0"
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
}: {
  genreName: string;
  list: TVItem[];
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
          className={`flex overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth ${isTrending
              ? "gap-8 sm:gap-12 md:gap-14 pl-8 sm:pl-12 md:pl-16 lg:pl-20"
              : "gap-4 pb-1"
            }`}
        >
          {displayList.map((tv, index) => {
            if (isTrending) {
              return (
                <div
                  key={tv.id}
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

                  {/* TV Card Poster */}
                  <div
                    className="relative z-20 flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950"
                    onClick={() => navigate(`/video/${tv.id}`)}
                  >
                    <img
                      src={tv.signedThumbnailUrl || "/assets/poster.png"}
                      alt={tv.title}
                      className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
                    />

                    {/* Mobile Title bar fallback */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 md:hidden z-1">
                      <p className="text-sm font-semibold text-white truncate text-center drop-shadow-md">
                        {tv.title}
                      </p>
                    </div>

                    {/* The theatrical hover details overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                      {/* Genre/Category Badge */}
                      <div className="flex justify-end mb-1 md:mb-2">
                        <span className="text-[8px] md:text-[9px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {tv.genres && tv.genres.length > 0
                            ? tv.genres[0]
                            : "TV Show"}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs md:text-sm font-bold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                        {tv.title}
                      </h4>

                      {/* Metadata Row */}
                      <div className="flex items-center justify-between text-[8px] md:text-[9px] font-semibold text-zinc-400 mb-1.5 md:mb-2.5">
                        <span className="truncate">English (UK)</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[8px] md:text-[9px] opacity-85">
                            🌐
                          </span>
                          <span>{tv.duration || "N/A"}</span>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/video/${tv.id}`);
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
                </div>
              );
            }

            // Normal TV Row Item
            return (
              <div
                key={tv.id}
                className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-zinc-900 bg-zinc-950 snap-start"
                onClick={() => navigate(`/video/${tv.id}`)}
              >
                <img
                  src={tv.signedThumbnailUrl || "/assets/poster.png"}
                  alt={tv.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] group-hover:brightness-[0.4] transition-all duration-300"
                />

                {/* Mobile Title bar fallback (Visible when not hovered on touch devices) */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300 md:hidden z-1">
                  <p className="text-sm font-semibold text-white truncate text-center drop-shadow-md">
                    {tv.title}
                  </p>
                </div>

                {/* The theatrical hover details overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                  {/* Genre/Category Badge */}
                  <div className="flex justify-end mb-1 md:mb-2">
                    <span className="text-[8px] md:text-[9px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {tv.genres && tv.genres.length > 0
                        ? tv.genres[0]
                        : "TV Show"}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs md:text-sm font-bold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                    {tv.title}
                  </h4>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[8px] md:text-[9px] font-semibold text-zinc-400 mb-1.5 md:mb-2.5">
                    <span className="truncate">English (UK)</span>
                    <div className="flex items-center gap-0.5">
                      <span className="text-[8px] md:text-[9px] opacity-85">
                        🌐
                      </span>
                      <span>{tv.duration || "N/A"}</span>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/video/${tv.id}`);
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

const TvTab = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tvShows, setTvShows] = useState<TVItem[]>([]);
  const [groupedTV, setGroupedTV] = useState<Record<string, TVItem[]>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "forYou";
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  // Featured hero carousel state
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchTVShows = async () => {
      try {
        setIsLoading(true);
        const fetchedTV = await getMatchingData(
          "media",
          "category",
          "==",
          "TV Show",
        );

        const signedTV = await Promise.all(
          fetchedTV.map(async (show) => {
            let signedThumb = show.thumbnailUrl || "";
            if (signedThumb) {
              try {
                signedThumb = await getSignedUrl(show.thumbnailUrl);
              } catch (err) {
                console.error("Error signing URL:", err);
              }
            }
            return {
              ...show,
              signedThumbnailUrl: signedThumb,
            } as TVItem;
          }),
        );

        setTvShows(signedTV);
      } catch (error) {
        console.error("Error fetching TV shows from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTVShows();
  }, []);

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
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  // Auto scroll featured hero TV shows every 6 seconds
  useEffect(() => {
    if (!carouselApi) return;
    const timer = setInterval(() => {
      carouselApi.scrollNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [carouselApi]);

  const featuredList = tvShows.slice(0, 4); // Use first 4 TV shows as featured banners

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 relative">
      {/* Semi-transparent Header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-sm z-50 flex items-center justify-between px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/60 border border-zinc-900/60 hover:bg-zinc-800 text-white"
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
            <div className="relative w-full h-[55vh] md:h-[70vh] bg-black border-b border-zinc-900 overflow-hidden group/hero">
              <Carousel
                setApi={setCarouselApi}
                opts={{ align: "start", loop: true }}
                className="w-full h-full [&>[data-slot=carousel-content]]:h-full"
              >
                <CarouselContent className="ml-0 h-full">
                  {featuredList.map((featuredShow) => (
                    <CarouselItem
                      key={featuredShow.id}
                      className="pl-0 w-full h-full relative shrink-0"
                    >
                      <div className="relative w-full h-full select-none">
                        <img
                          src={
                            featuredShow.signedThumbnailUrl ||
                            "/assets/poster.png"
                          }
                          alt={featuredShow.title}
                          className="w-full h-full object-cover opacity-80"
                        />
                        {/* Rich cinematic fades */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-[2]" />
                        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-[2]" />

                        {/* Text and buttons overlay details */}
                        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-16 pb-14 md:pb-20 z-[3] text-left">
                          <span className="text-xs uppercase tracking-widest font-bold text-primary mb-2">
                            Featured TV Show
                          </span>
                          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight drop-shadow-md max-w-2xl mb-3">
                            {featuredShow.title}
                          </h1>
                          <p className="hidden md:block text-zinc-300 text-sm max-w-xl leading-relaxed font-normal mb-6 line-clamp-3">
                            {featuredShow.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() =>
                                navigate(`/video/${featuredShow.id}`)
                              }
                              className="bg-white hover:bg-white/95 text-black font-bold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md w-[150px]"
                            >
                              <Play className="w-4 h-4 fill-current text-black" />
                              <span>Play</span>
                            </Button>
                            <Button
                              onClick={() =>
                                navigate(`/video/${featuredShow.id}`)
                              }
                              variant="outline"
                              className="bg-zinc-800/40 hover:bg-zinc-700/60 border-zinc-650 text-white font-semibold px-6 py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm w-[150px]"
                            >
                              <span>More Info</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Slider Dots indicators */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
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
          )}

          {/* Category Tabs */}
          <div className="flex items-center gap-6 px-4 md:px-12 lg:px-16 pt-6 pb-0 border-b border-zinc-900 w-full max-w-7xl mx-auto">
            <button
              onClick={() => setActiveTab("forYou")}
              className={`pb-3 text-sm md:text-base font-semibold transition-colors relative ${activeTab === "forYou" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              For You
              {activeTab === "forYou" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
            <button
              onClick={() => setActiveTab("tvShows")}
              className={`pb-3 text-sm md:text-base font-semibold transition-colors relative ${activeTab === "tvShows" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
            >
              TV Shows
              {activeTab === "tvShows" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />}
            </button>
            <button
              onClick={() => setActiveTab("documentaries")}
              className={`pb-3 text-sm md:text-base font-semibold transition-colors relative ${activeTab === "documentaries" ? "text-primary" : "text-zinc-400 hover:text-white"}`}
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
              <RecentTVShows isGrid={true} />
            )}

            {activeTab === "documentaries" && (
              <DocumentaryList isGrid={true} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TvTab;
