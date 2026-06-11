import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ArrowLeft, Bookmark, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const WatchlistPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { title: string; items: any[] } | null;

  if (!state || !state.items) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">No data found.</p>
        <Button 
          onClick={() => navigate(-1)}
          className="rounded-lg font-semibold"
        >
          Go Back
        </Button>
      </div>
    );
  }

  const { title, items } = state;
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
            className="-ml-2 rounded-full"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
      </div>

      {/* ═══ DESKTOP Header (inline) ═══ */}
      <div className="hidden md:block max-w-[1400px] mx-auto w-full px-6 lg:px-10 xl:px-16 pt-8">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border-border"
            id="watchlist-back-desktop"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {isContinueWatching ? (
                <Play className="w-5 h-5 text-primary" />
              ) : (
                <Bookmark className="w-5 h-5 text-primary" />
              )}
            </div>
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
                  className="flex flex-col overflow-hidden cursor-pointer group border-border shadow-sm hover:shadow-md transition-all bg-card/60"
                  onClick={() => navigate(`/video/${movieId}`)}
                >
                  <div className="relative aspect-[2/3] w-full bg-muted">
                    <img
                      src={posterUrl}
                      alt={titleText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {isContinue && item.progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                        <div
                          className="h-full bg-destructive"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2.5 sm:p-3 pb-3">
                    <p className="text-foreground text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {titleText}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ DESKTOP Grid ═══ */}
      <div className="hidden md:block max-w-[1400px] mx-auto w-full px-6 lg:px-10 xl:px-16 pt-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-3">
            {isContinueWatching ? (
              <Play className="w-12 h-12 opacity-30" />
            ) : (
              <Bookmark className="w-12 h-12 opacity-30" />
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
                  className="flex flex-col overflow-hidden cursor-pointer group border-border shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 bg-card/60"
                  onClick={() => navigate(`/video/${movieId}`)}
                >
                  <div className="relative aspect-[2/3] w-full bg-muted overflow-hidden">
                    <img
                      src={posterUrl}
                      alt={titleText}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    {isContinue && item.progress > 0 && (
                      <>
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/60">
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
                  </div>
                  <CardContent className="p-3.5">
                    <p className="text-foreground text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {titleText}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
