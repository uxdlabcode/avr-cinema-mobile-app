import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Play, Plus, Check, Loader2 } from "lucide-react";
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

const GenrePageSkeleton = () => (
  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
    {Array.from({ length: 12 }).map((_, i) => (
      <Skeleton key={i} className="w-full aspect-[2/3] rounded-md bg-zinc-900 animate-pulse" />
    ))}
  </div>
);

const GenrePage = () => {
  const { genreName } = useParams<{ genreName: string }>();
  const navigate = useNavigate();
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
          limitVal: 12,
          userAge: user?.age ?? null,
        })
      );
    }
  }, [genreName, user?.age, dispatch]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore || !genreName) return;
    dispatch(
      fetchGenreMedia({
        genreName,
        limitVal: 12,
        userAge: user?.age ?? null,
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
  }, [lastDocId, hasMore, loading, loadingMore, genreName, dispatch, user?.age]);

  return (
    <div className="min-h-screen bg-black text-white w-full pb-6">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between h-[70px] px-4 md:px-12 bg-black/90 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-850 rounded-full transition-colors cursor-pointer border border-zinc-800 text-white flex items-center justify-center outline-none"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide capitalize text-white">
            {genreName}
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-12 lg:px-16 pt-8">
        {loading ? (
          <GenrePageSkeleton />
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-zinc-400 text-lg">No movies or TV shows found under "{genreName}".</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-4 py-2 bg-primary text-black font-semibold rounded hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {media.map((item) => (
                <div
                  key={item.id}
                  tabIndex={0}
                  onClick={() => navigate(`/video/${item.id}`)}
                  className="focusable flex flex-col aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-zinc-900 bg-zinc-950 snap-start outline-none"
                >
                  <img
                    src={item.signedThumbnailUrl || "/assets/poster.png"}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] group-hover:brightness-[0.4] transition-all duration-300"
                  />

                  {/* Mobile Title bar fallback */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black via-black/80 to-transparent group-hover:opacity-0 transition-opacity duration-300 md:hidden z-1">
                    <p className="text-xs font-semibold text-white truncate text-center drop-shadow-md">
                      {item.title}
                    </p>
                  </div>

                  {/* Desktop Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 text-left z-10 border border-zinc-800/80 rounded-md">
                    <div className="flex justify-end mb-1">
                      <span className="text-[8px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {item.category || "Media"}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between text-[8px] font-semibold text-zinc-400 mb-2">
                      <span className="truncate">{item.language || "English"}</span>
                      <span>{item.duration || "N/A"}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        tabIndex={-1}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/video/${item.id}`);
                        }}
                        className="flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-[10px] rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                      >
                        Play
                      </button>
                      <button
                        tabIndex={-1}
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

            {/* Intersection target and loading state for infinite scroll */}
            <div ref={observerTarget} className="flex justify-center w-full py-8">
              {loadingMore && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading more content...</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default GenrePage;
