import { useEffect } from "react";
import { Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchWatchProgress } from "@/store/slices/watchProgressSlice";
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
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;

  const { items, status } = useSelector((state: RootState) => state.watchProgress);
  const loading = status === "loading" || status === "idle";

  useEffect(() => {
    if (userId) {
      dispatch(fetchWatchProgress(userId));
    }
  }, [userId, dispatch]);

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