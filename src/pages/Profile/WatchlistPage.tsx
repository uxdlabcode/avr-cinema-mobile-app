import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export const WatchlistPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { title: string; items: any[] } | null;

  if (!state || !state.items) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No data found.</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { title, items } = state;
 
  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      {/* Grid */}
      <div className="p-4 pt-24">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            {title} is empty
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item) => {
              // Determine properties based on whether it's a watchlist or continue watching item
              const isContinue = 'progress' in item;
              const posterUrl = item.poster || item.image || "/assets/poster.png";
              const titleText = item.title || "Unknown";
              const movieId = item.movieId || item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 cursor-pointer group"
                  onClick={() => navigate(`/video/${movieId}`)}
                >
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-muted">
                    <img
                      src={posterUrl}
                      alt={titleText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {isContinue && item.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                        <div
                          className="h-full bg-destructive rounded-r-full"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-foreground text-sm font-medium truncate px-1">
                    {titleText}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
