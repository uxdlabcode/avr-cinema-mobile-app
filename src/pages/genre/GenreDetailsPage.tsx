import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Play, Plus, Check, Loader2, Film, Tv, Layers } from "lucide-react";
import { compoundQuery, deleteDocument, createDocument } from "@/Firebase";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchGenreMedia, resetGenreState } from "@/store/slices/genreSlice";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  genres?: string[];
  duration?: string;
  releaseYear?: number;
  category?: string;
  [key: string]: any;
}

const GenreDetailsSkeleton = () => (
  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
    {Array.from({ length: 12 }).map((_, i) => (
      <Skeleton key={i} className="w-full aspect-[2/3] rounded-lg bg-zinc-900/80 animate-pulse border border-zinc-800/50" />
    ))}
  </div>
);

export const GenreDetailsPage: React.FC = () => {
  const { genreName } = useParams<{ genreName: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterType = searchParams.get("type") || "all";
  const dispatch = useDispatch<AppDispatch>();

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;

  const media = useSelector((state: RootState) => state.genre.items);
  const status = useSelector((state: RootState) => state.genre.status);
  const hasMore = useSelector((state: RootState) => state.genre.hasMore);
  const lastDocId = useSelector((state: RootState) => state.genre.lastDocId);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loading = status === "loading";
  const loadingMore = status === "loadingMore";

  const filteredMedia = React.useMemo(() => {
    if (!media) return [];
    if (filterType === "movie" || filterType === "movies") {
      return media.filter((item) => item.category === "Movie");
    } else if (filterType === "tv" || filterType === "tv show" || filterType === "tv shows") {
      return media.filter((item) => item.category === "TV Show");
    } else if (filterType === "doc" || filterType === "documentary" || filterType === "documentaries") {
      return media.filter((item) => item.category === "Documentary");
    } else if (filterType === "tv_and_doc") {
      return media.filter((item) => item.category === "TV Show" || item.category === "Documentary");
    }
    return media;
  }, [media, filterType]);

  const getHeaderTitle = () => {
    if (!genreName) return "";
    const isCategoryName = ["tv show", "tv shows", "documentary", "documentaries", "trailer", "trailers"].includes(genreName.toLowerCase());
    if (isCategoryName) return genreName;
    return genreName;
  };

  const getActiveBadge = () => {
    if (filterType === "movie" || filterType === "movies") return "Movies";
    if (filterType === "tv" || filterType === "tv show" || filterType === "tv shows") return "TV Shows";
    if (filterType === "doc" || filterType === "documentary" || filterType === "documentaries") return "Documentaries";
    if (filterType === "tv_and_doc") return "TV & Documentaries";
    return "All Categories";
  };

  const handleFilterChange = (newType: string) => {
    setSearchParams({ type: newType });
  };

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
            category: movieData.category || "Movie",
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

  // Trigger load on genreName or age filter change
  useEffect(() => {
    dispatch(resetGenreState());
    if (genreName) {
      dispatch(
        fetchGenreMedia({
          genreName,
          limitVal: 20,
          userAge: user?.age ?? null,
          filterType,
        })
      );
    }
  }, [genreName, filterType, user?.age, dispatch]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore || !genreName) return;
    dispatch(
      fetchGenreMedia({
        genreName,
        limitVal: 20,
        userAge: user?.age ?? null,
        filterType,
      })
    );
  };

  // Infinite scroll observer setup
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [lastDocId, hasMore, loading, loadingMore, genreName, filterType, dispatch, user?.age]);

  const isLiteralCategory = ["tv show", "tv shows", "documentary", "documentaries", "trailer", "trailers"].includes((genreName || "").toLowerCase());

  return (
    <div className="min-h-screen bg-black text-white w-full pb-16 pt-14 selection:bg-primary selection:text-black">
      {/* Fixed Logo Header Bar matching TvTab */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-black z-50 flex items-center justify-between px-4 border-b border-zinc-900/80">
        <button
          onClick={() => navigate(-1)}
          className="focusable p-2 hover:bg-zinc-850 rounded-full transition-all duration-200 cursor-pointer text-white flex items-center justify-center outline-none"
          aria-label="Go Back"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <img
          src="/assets/headerLogo.png"
          alt="AVR Cinema"
          className="h-10 md:h-12 w-auto object-contain absolute left-1/2 -translate-x-1/2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
        />
      </div>

      {/* Sticky Underline Tabs Navigation matching TvTab */}
      <div className="sticky top-14 z-40 bg-black flex gap-6 px-4 md:px-12 pt-3 overflow-x-auto scrollbar-hide border-b border-zinc-900 w-full">
        {!isLiteralCategory ? (
          [
            { id: "all", label: "All" },
            { id: "movie", label: "Movies" },
            { id: "tv", label: "TV Shows" },
            { id: "doc", label: "Documentaries" },
          ].map((tab) => {
            const isActive = filterType === tab.id || (tab.id === "all" && !filterType);
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`focusable pb-2 text-xs md:text-lg lg:text-sm font-semibold transition-colors relative whitespace-nowrap outline-none focus:bg-zinc-850 rounded px-2 cursor-pointer ${isActive ? "text-primary" : "text-zinc-400 hover:text-white"
                  }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />
                )}
              </button>
            );
          })
        ) : (
          <div className="pb-2 text-xs md:text-lg lg:text-sm font-semibold text-primary px-2 relative">
            {genreName}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-md" />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-12 pt-6">
        <h1 className="text-xl md:text-2xl font-bold tracking-wide capitalize text-white mb-6">
          {getHeaderTitle()}
        </h1>
        {loading ? (
          <GenreDetailsSkeleton />
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-500">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No {getActiveBadge().toLowerCase()} found</h3>
            <p className="text-zinc-400 text-sm mb-6">
              We couldn't find any titles in "{genreName}" matching this category filter. Try switching categories above.
            </p>
            <button
              onClick={() => handleFilterChange("all")}
              className="focusable px-6 py-2.5 bg-primary text-black font-bold text-sm rounded-full hover:bg-primary/90 transition-transform active:scale-95 shadow-lg shadow-primary/20"
            >
              View All Categories
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  tabIndex={0}
                  onClick={() => navigate(`/video/${item.id}`)}
                  className="focusable flex flex-col aspect-[2/3] relative rounded-lg overflow-hidden cursor-pointer group shadow-lg border border-zinc-900 bg-zinc-950 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-zinc-700 outline-none"
                >
                  <img
                    src={item.signedThumbnailUrl || "/assets/poster.png"}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-[0.35] transition-all duration-500"
                  />

                  {/* Mobile Title Bar */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300 md:hidden z-1">
                    <p className="text-xs font-bold text-white truncate text-center drop-shadow-md">
                      {item.title}
                    </p>
                  </div>

                  {/* Desktop Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3.5 text-left z-10 border border-zinc-700/60 rounded-lg backdrop-blur-[2px]">
                    <div className="flex justify-end mb-1.5">
                      <span className="text-[9px] font-bold text-primary bg-black/90 border border-primary/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {item.category || "Media"}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-white leading-tight mb-1 line-clamp-2 drop-shadow-md">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] font-medium text-zinc-300 mb-3">
                      <span className="truncate">{item.language || "English"}</span>
                      <span>{item.duration || "N/A"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/video/${item.id}`);
                        }}
                        className="focusable flex-1 py-1.5 bg-primary hover:bg-primary/90 text-black font-bold text-xs rounded transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 shadow"
                      >
                        <Play className="w-3 h-3 fill-black" /> Play
                      </button>
                      <button
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(item.id, item);
                        }}
                        className="focusable p-1.5 bg-zinc-900/90 border border-zinc-700 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-all active:scale-95 shadow"
                      >
                        {watchlist.includes(item.id.toString()) ? (
                          <Check className="w-3.5 h-3.5 text-[#DECB94]" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Intersection target and loading state for infinite scroll */}
            <div ref={observerTarget} className="flex justify-center w-full py-12">
              {loadingMore && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading more titles...</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default GenreDetailsPage;
