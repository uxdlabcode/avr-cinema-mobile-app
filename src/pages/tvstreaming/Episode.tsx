import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Check, Tv } from 'lucide-react';
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchEpisodeMedia } from "@/store/slices/episodeSlice";
import { getSignedUrl } from '@/Firebase';

interface TvShowItem {
  id: string;
  title: string;
  thumbnailUrl?: string;
  signedThumbnailUrl?: string;
  releaseYear?: number;
  seasons?: any[];
  createdAt?: any;
  [key: string]: any;
}

interface Props {
  isGrid?: boolean;
  watchlist?: string[];
  toggleWatchlist?: (movieId: string, movieData: any) => void;
}

const RecentTVShows: React.FC<Props> = ({ isGrid = false, watchlist = [], toggleWatchlist }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const mediaItems = useSelector((state: RootState) => state.episode.items);
  const mediaStatus = useSelector((state: RootState) => state.episode.status);

  const [items, setItems] = useState<TvShowItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, TvShowItem[]>>({});
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    if (mediaStatus === "idle") {
      dispatch(fetchEpisodeMedia());
    }
  }, [mediaStatus, dispatch]);

  useEffect(() => {
    if (items.length === 0) return;
    const groups: Record<string, TvShowItem[]> = {};
    items.forEach((item) => {
      if (item.genres && item.genres.length > 0) {
        item.genres.forEach((genre: string) => {
          if (!groups[genre]) {
            groups[genre] = [];
          }
          if (!groups[genre].some(g => g.id === item.id)) {
            groups[genre].push(item);
          }
        });
      } else {
        const fallback = "General";
        if (!groups[fallback]) {
          groups[fallback] = [];
        }
        if (!groups[fallback].some(g => g.id === item.id)) {
          groups[fallback].push(item);
        }
      }
    });
    setGroupedItems(groups);
  }, [items]);

  useEffect(() => {
    const processShows = async () => {
      try {
        const tvShows = mediaItems.filter(item => item.category === "TV Show");

        // Sort by createdAt desc (most recent first)
        const sorted = (tvShows || []).sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const signed = await Promise.all(
          sorted.map(async (show) => {
            let thumb = show.thumbnailUrl || '';
            if (thumb) {
              try {
                thumb = await getSignedUrl(show.thumbnailUrl);
              } catch {
                thumb = show.thumbnailUrl;
              }
            }
            return { ...show, signedThumbnailUrl: thumb } as TvShowItem;
          })
        );

        setItems(signed);
      } catch (err) {
        console.error('Error processing TV Shows:', err);
      }
    };

    if (mediaStatus === "succeeded") {
      processShows();
    }
  }, [mediaItems, mediaStatus]);

  const updateScrollButtons = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 5);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const row = rowRef.current;
    if (row) {
      row.addEventListener('scroll', updateScrollButtons);
      window.addEventListener('resize', updateScrollButtons);
      const timer = setTimeout(updateScrollButtons, 500);
      return () => {
        row.removeEventListener('scroll', updateScrollButtons);
        window.removeEventListener('resize', updateScrollButtons);
        clearTimeout(timer);
      };
    }
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75,
        behavior: 'smooth',
      });
    }
  };

  if (items.length === 0) return null;

  if (isGrid) {
    return (
      <div className="space-y-8 w-full text-left">
        {Object.keys(groupedItems).map((genre) => {
          const genreItems = groupedItems[genre];
          if (genreItems.length === 0) return null;
          return (
            <div key={genre} className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Tv className="w-4 h-4 text-primary" />
                <h3 className="text-base md:text-xl font-bold text-white tracking-wide">
                  {genre}
                </h3>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 pb-4">
                {genreItems.map((show) => (
                  <div
                    key={show.id}
                    tabIndex={0}
                    onClick={() => navigate(`/video/${show.id}`)}
                    className="focusable relative w-full h-full lg:h-[90%] aspect-[2/3] rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950 outline-none"
                  >
                    <img
                      src={show.signedThumbnailUrl || '/assets/poster.png'}
                      alt={show.title}
                      className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
                    />

                    {/* Mobile Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 md:hidden z-10">
                      <p className="text-xs font-semibold text-white truncate text-center drop-shadow-md">
                        {show.title}
                      </p>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                      <div className="flex justify-end mb-1">
                        <span className="text-[8px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          TV Show
                        </span>
                      </div>
                      <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 truncate drop-shadow-md">
                        {show.title}
                      </h4>
                      <div className="flex items-center justify-between text-[8px] font-semibold text-zinc-400 mb-1.5">
                        <span>{show.releaseYear || 'N/A'}</span>
                        <span>{show.seasons ? `${show.seasons.length} S` : '1 S'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/video/${show.id}`); }}
                          tabIndex={-1}
                          className="flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                        >
                          Play
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (toggleWatchlist) {
                              toggleWatchlist(show.id, show);
                            }
                          }}
                          tabIndex={-1}
                          className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                        >
                          {watchlist.includes(show.id.toString()) ? (
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
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`text-left relative group/row w-full space-y-1`}>
      <div className="flex items-center gap-2 mb-3">
        <Tv className="w-4 h-4 text-primary" />
        <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide">
          TV Shows
        </h3>
      </div>

      <div className="relative w-full">
        {/* Left Scroll */}
        {showLeft && (
          <button
            tabIndex={-1}
            onClick={() => handleScroll('left')}
            className="absolute left-[-20px] md:left-[-35px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Scroll */}
        {showRight && (
          <button
            tabIndex={-1}
            onClick={() => handleScroll('right')}
            className="absolute right-[-20px] md:right-[-35px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Row */}
        <div
          ref={rowRef}
          className="flex overflow-x-auto pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-3"
        >
          {items.map((show) => (
            <div
              key={show.id}
              tabIndex={0}
              onClick={() => navigate(`/video/${show.id}`)}
              className="focusable flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950 snap-start outline-none"
            >
              <img
                src={show.signedThumbnailUrl || '/assets/poster.png'}
                alt={show.title}
                className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
              />

              {/* Mobile Title */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 md:hidden z-10">
                <p className="text-xs font-semibold text-white truncate text-center drop-shadow-md">
                  {show.title}
                </p>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                <div className="flex justify-end mb-1">
                  <span className="text-[8px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    TV Show
                  </span>
                </div>
                <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 truncate drop-shadow-md">
                  {show.title}
                </h4>
                <div className="flex items-center justify-between text-[8px] font-semibold text-zinc-400 mb-1.5">
                  <span>{show.releaseYear || 'N/A'}</span>
                  <span>{show.seasons ? `${show.seasons.length} S` : '1 S'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/video/${show.id}`); }}
                    tabIndex={-1}
                    className="flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                  >
                    Play
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (toggleWatchlist) {
                        toggleWatchlist(show.id, show);
                      }
                    }}
                    tabIndex={-1}
                    className="p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                  >
                    {watchlist.includes(show.id.toString()) ? (
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
      </div>
    </div>
  );
};

export default RecentTVShows;