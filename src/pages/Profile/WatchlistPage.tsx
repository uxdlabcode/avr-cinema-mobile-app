import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ArrowLeft, Bookmark, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { db } from "@/Firebase/firebase";
import { getSignedUrl } from "@/Firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

export const WatchlistPageSkeleton = () => (
  <div className="min-h-screen flex flex-col bg-background pb-24 md:pb-16">
    {/* MOBILE Header Skeleton */}
    <div className="md:hidden fixed top-0 left-0 right-0 w-full z-50 bg-background border-b border-border">
      <div className="flex items-center gap-4 p-4">
        <Skeleton className="w-9 h-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>

    {/* DESKTOP Header Skeleton */}
    <div className="hidden md:block mx-auto w-full px-6 lg:px-10 xl:px-16 pt-8">
      <div className="flex items-center gap-4 mb-2">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="h-px bg-border mt-4" />
    </div>

    {/* Grid Skeleton */}
    <div className="mx-auto w-full px-4 md:px-6 lg:px-10 xl:px-16 pt-24 md:pt-8">
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl bg-zinc-900" />
        ))}
      </div>
    </div>
  </div>
);

export const WatchlistPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { title: string; items: any[] } | null;
  const user = useSelector((s: RootState) => s.auth.user);

  const [items, setItems] = useState<any[]>(state?.items ?? []);
  const [title, setTitle] = useState(state?.title ?? "Watchlist");
  const [loading, setLoading] = useState(!state);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state) return; // already loaded from state
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchWatchlist = async () => {
      try {
        const q = query(collection(db, "my_list"), where("userId", "==", user.id));
        const querySnapshot = await getDocs(q);
        const fetchedItems: any[] = [];
        for (const d of querySnapshot.docs) {
          const itemData = d.data();
          if (itemData.image) {
            try {
              itemData.image = await getSignedUrl(itemData.image);
            } catch {
              // fallback
            }
          }
          fetchedItems.push({ id: d.id, ...itemData });
        }
        setItems(fetchedItems);
      } catch (err) {
        console.error("Error fetching watchlist:", err);
        setError("Failed to load watchlist. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, [user?.id, state]);

  if (loading) {
    return <WatchlistPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={() => navigate(-1)}
          className="focusable rounded-lg font-semibold focus:scale-102 outline-none"
        >
          Go Back
        </Button>
      </div>
    );
  }

  const isContinueWatching = items.some((item) => "progress" in item);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-24 md:pb-16">

      {/* ═══ MOBILE Header (fixed) ═══ */}
      <div className="md:hidden fixed top-0 left-0 right-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="focusable -ml-2 rounded-full focus:bg-zinc-800 outline-none"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
      </div>

      {/* ═══ DESKTOP Header (inline) ═══ */}
      <div className="hidden md:block mx-auto w-full px-6 lg:px-10 xl:px-16 pt-8">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="focusable w-10 h-10 rounded-xl border-border outline-none"
            id="watchlist-back-desktop"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
        </div>
        <div className="h-px bg-border mt-4" />
      </div>

      {/* ═══ MOBILE Grid ═══ */}
      <div className="md:hidden p-4 pt-24">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            {title} is empty
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {items.map((item) => {
              const isContinue = "progress" in item;
              const posterUrl = item.poster || item.image || "/assets/poster.png";
              const titleText = item.title || "Unknown";
              const movieId = item.movieId || item.id;

              return (
                <Card
                  key={item.id}
                  tabIndex={0}
                  className="focusable relative aspect-[2/3] w-full overflow-hidden cursor-pointer group border-border shadow-sm bg-card p-0 gap-0 outline-none"
                  onClick={() => navigate(`/video/${movieId}`)}
                >
                  <img
                    src={posterUrl}
                    alt={titleText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Text Overlay at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2 pb-2.5 pt-8 flex items-end justify-center">
                    <p className="text-white text-[10px] sm:text-xs font-semibold truncate text-center w-full drop-shadow-md">
                      {titleText}
                    </p>
                  </div>

                  {isContinue && item.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
                      <div
                        className="h-full bg-destructive"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ DESKTOP Grid ═══ */}
      <div className="hidden md:block mx-auto w-full px-6 lg:px-10 xl:px-16 pt-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
            {isContinueWatching ? (
              <Play className="w-12 h-12 opacity-30" />
            ) : (
              ""
            )}
            <p className="text-lg">{title} is empty</p>
            <p className="text-sm">Start exploring to add items here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
            {items.map((item) => {
              const isContinue = "progress" in item;
              const posterUrl = item.poster || item.image || "/assets/poster.png";
              const titleText = item.title || "Unknown";
              const movieId = item.movieId || item.id;

              return (
                <Card
                  key={item.id}
                  tabIndex={0}
                  className="focusable relative aspect-[2/3] w-full overflow-hidden cursor-pointer group border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 bg-card p-0 gap-0 outline-none"
                  onClick={() => navigate(`/video/${movieId}`)}
                >
                  <img
                    src={posterUrl}
                    alt={titleText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                  {/* Text Overlay at the bottom */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3 pb-3.5 pt-10 flex items-end justify-center">
                    <p className="text-white text-xs lg:text-sm font-semibold truncate text-center w-full drop-shadow-md">
                      {titleText}
                    </p>
                  </div>

                  {isContinue && item.progress > 0 && (
                    <>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/30">
                        <div
                          className="h-full bg-destructive"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm">
                        {item.progress}%
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
