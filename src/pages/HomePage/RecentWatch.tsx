import { useEffect, useState } from "react";
import { Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { compoundQuery, getDocumentData, getSignedUrl } from "@/Firebase";
import { Skeleton } from "@/components/ui/skeleton";

interface WatchItem {
  id: string;
  movieId: string;
  title: string;
  image: string;
  currentTime: number;
  duration: number;
}

const RecentWatch = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;

  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        // 1. Get all watch_progress docs for this user
        const docs = await compoundQuery("watch_progress", [
          { key: "userId", operator: "==", value: userId },
        ]);

        if (!docs || docs.length === 0) {
          setLoading(false);
          return;
        }

        // 2. Sort by updatedAt (latest first) and take top 10
        const sorted = [...docs]
          .filter((d) => d.currentTime > 0 && d.duration > 0)
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .slice(0, 10);

        // 3. For each item, fetch the media document to get title + thumbnail
        const enriched: WatchItem[] = await Promise.all(
          sorted.map(async (doc) => {
            try {
              const media = await getDocumentData("media", doc.movieId);
              let image = "/assets/episode1.webp";
              if (media?.thumbnailUrl) {
                try {
                  image = await getSignedUrl(media.thumbnailUrl);
                } catch {
                  image = media.thumbnailUrl;
                }
              }
              return {
                id: doc.id,
                movieId: doc.movieId,
                title: media?.title || "Unknown",
                image,
                currentTime: doc.currentTime,
                duration: doc.duration,
              };
            } catch {
              return {
                id: doc.id,
                movieId: doc.movieId,
                title: "Unknown",
                image: "/assets/episode1.webp",
                currentTime: doc.currentTime,
                duration: doc.duration,
              };
            }
          })
        );

        setItems(enriched);
      } catch (err) {
        console.error("Error fetching watch progress:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId]);

  // Don't render if no items
  if (!loading && items.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg md:text-xl font-semibold mb-3 flex items-center text-primary cursor-pointer">
        Continue Watching on AVR <ChevronRight className="w-5 h-5 ml-1 text-primary" />
      </h2>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
        {loading
          ? // Skeleton placeholders
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="relative shrink-0 w-64 md:w-72 aspect-video rounded-md overflow-hidden snap-start"
              />
            ))
          : items.map((item) => {
              const progressPct =
                item.duration > 0
                  ? Math.min((item.currentTime / item.duration) * 100, 100)
                  : 0;

              return (
                <div
                  key={item.id}
                  tabIndex={0}
                  className="focusable relative shrink-0 w-64 md:w-72 aspect-video rounded-md overflow-hidden snap-start cursor-pointer group outline-none"
                  onClick={() => navigate(`/video/${item.movieId}`)}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />

                  {/* Bottom overlay: play icon + title */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
                    <Play className="w-6 h-6 text-primary drop-shadow-md fill-primary shrink-0" />
                    <span className="text-xs font-semibold drop-shadow-md text-primary truncate max-w-[70%] text-right">
                      {item.title}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary-foreground/30">
                    <div
                      className="h-full bg-secondary-foreground transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default RecentWatch;