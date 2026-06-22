import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Check, Film } from 'lucide-react';
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchDocumentaryMedia } from "@/store/slices/documentarySlice";
import { getSignedUrl } from '@/Firebase';
import { Skeleton } from '@/components/ui/skeleton';

interface DocItem {
  id: string;
  title: string;
  thumbnailUrl?: string;
  signedThumbnailUrl?: string;
  releaseYear?: string | number;
  duration?: string;
  genres?: string[];
  category?: string;
  seasons?: any[];
  [key: string]: any;
}

interface Props {
  isGrid?: boolean;
  watchlist?: string[];
  toggleWatchlist?: (movieId: string, movieData: any) => void;
}

const DocumentaryList: React.FC<Props> = ({ isGrid = false, watchlist = [], toggleWatchlist }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const mediaItems = useSelector((state: RootState) => state.documentary.items);
  const mediaStatus = useSelector((state: RootState) => state.documentary.status);

  const [items, setItems] = useState<DocItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<Record<string, DocItem[]>>({});
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const groups: Record<string, DocItem[]> = {};
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
    if (mediaStatus === "idle") {
      dispatch(fetchDocumentaryMedia());
    }
  }, [mediaStatus, dispatch]);

  useEffect(() => {
    const processDocs = async () => {
      try {
        const fetchedDocs = mediaItems.filter(item => item.category === "Documentary");

        // Sort by createdAt desc
        const sortedDocs = (fetchedDocs || []).sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const signed = await Promise.all(
          sortedDocs.map(async (doc: any) => {
            let signedThumb = doc.thumbnailUrl || "";
            if (signedThumb) {
              try {
                signedThumb = await getSignedUrl(doc.thumbnailUrl);
              } catch (err) {
                console.error("Error signing URL:", err);
              }
            }
            return {
              ...doc,
              signedThumbnailUrl: signedThumb
            } as DocItem;
          })
        );

        setItems(signed);
      } catch (err) {
        console.error('Error processing documentaries:', err);
      }
    };

    if (mediaStatus === "succeeded") {
      processDocs();
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

  const isLoading = mediaStatus === "loading" || mediaStatus === "idle";

  if (isLoading) {
    if (isGrid) {
      return (
        <div className="space-y-8 w-full text-left animate-pulse">
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
      );
    }

    return (
      <div className="text-left w-full space-y-1 animate-pulse">
        <div className="flex items-center justify-between pr-4 mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-zinc-700" />
            <Skeleton className="h-6 w-32 bg-zinc-800" />
          </div>
        </div>
        <div className="flex gap-3 overflow-hidden w-full">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="shrink-0 w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] rounded-md bg-zinc-900"
            />
          ))}
        </div>
      </div>
    );
  }

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
                <Film className="w-4 h-4 text-primary" />
                <h3 className="text-base md:text-xl font-bold text-white tracking-wide">
                  {genre}
                </h3>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 pb-4">
                {genreItems.map((doc) => (
                  <div 
                    key={doc.id}
                    tabIndex={0}
                    onClick={() => navigate(`/video/${doc.id}`)}
                    className="focusable focusable relative w-full h-full lg:h-[90%] aspect-[2/3] rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950 outline-none"
                  >
                    <img
                      src={doc.signedThumbnailUrl || '/assets/poster.png'}
                      alt={doc.title}
                      className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
                    />

                    {/* Mobile Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 md:hidden z-10">
                      <p className="text-xs font-semibold text-white truncate text-center drop-shadow-md">
                        {doc.title}
                      </p>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                      <div className="flex justify-end mb-1">
                        <span className="text-[8px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Documentary
                        </span>
                      </div>
                      <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 truncate drop-shadow-md">
                        {doc.title}
                      </h4>
                      <div className="flex items-center justify-between text-[8px] font-semibold text-zinc-400 mb-1.5">
                        <span>{doc.releaseYear || 'N/A'}</span>
                        <span>{doc.seasons && doc.seasons.length > 0 ? `${doc.seasons.length} S` : (doc.duration || 'N/A')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/video/${doc.id}`); }}
                          tabIndex={-1}
                          className="focusable flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                        >
                          Play
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (toggleWatchlist) {
                              toggleWatchlist(doc.id, doc);
                            }
                          }}
                          tabIndex={-1}
                          className="focusable p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                        >
                          {watchlist.includes(doc.id.toString()) ? (
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
      <div className="flex items-center justify-between pr-4 mb-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          <h3 className="text-lg md:text-2xl font-bold text-white tracking-wide">
            Documentaries
          </h3>
        </div>
        {items.length > 15 && (
          <button 
            onClick={() => navigate(`/genre/Documentary`)}
            className="focusable text-xs md:text-sm text-primary hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer outline-none"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative w-full">
        {/* Left Scroll */}
        {showLeft && (
          <button 
            tabIndex={-1}
            onClick={() => handleScroll('left')}
            className="focusable absolute left-[-20px] md:left-[-35px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
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
            className="focusable absolute right-[-20px] md:right-[-35px] top-1/2 -translate-y-1/2 z-30 w-8 h-24 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg hidden md:flex md:opacity-0 md:group-hover/row:opacity-100"
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
          {items.slice(0, 15).map((doc) => (
            <div 
              key={doc.id}
              tabIndex={0}
              onClick={() => navigate(`/video/${doc.id}`)}
              className="focusable focusable flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group/card shadow-lg border border-zinc-900 bg-zinc-950 snap-start outline-none"
            >
              <img
                src={doc.signedThumbnailUrl || '/assets/poster.png'}
                alt={doc.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover/card:scale-[1.03] group-hover/card:brightness-[0.4] transition-all duration-300"
              />

              {/* Mobile Title */}
              <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/80 to-transparent group-hover/card:opacity-0 transition-opacity duration-300 md:hidden z-10">
                <p className="text-xs font-semibold text-white truncate text-center drop-shadow-md">
                  {doc.title}
                </p>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                <div className="flex justify-end mb-1">
                  <span className="text-[8px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Documentary
                  </span>
                </div>
                <h4 className="text-xs md:text-sm font-bold text-white leading-tight mb-1 truncate drop-shadow-md">
                  {doc.title}
                </h4>
                <div className="flex items-center justify-between text-[8px] font-semibold text-zinc-400 mb-1.5">
                  <span>{doc.releaseYear || 'N/A'}</span>
                  <span>{doc.seasons && doc.seasons.length > 0 ? `${doc.seasons.length} S` : (doc.duration || 'N/A')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/video/${doc.id}`); }}
                    tabIndex={-1}
                    className="focusable flex-1 py-1 bg-primary hover:bg-primary/90 text-black font-semibold text-xs rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                  >
                    Play
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (toggleWatchlist) {
                        toggleWatchlist(doc.id, doc);
                      }
                    }}
                    tabIndex={-1}
                    className="focusable p-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow"
                  >
                    {watchlist.includes(doc.id.toString()) ? (
                      <Check className="w-3 h-3 text-[#DECB94]" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length > 15 && (
            <div 
              onClick={() => navigate(`/genre/Documentary`)}
              className="focusable flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] aspect-[2/3] relative rounded-md overflow-hidden cursor-pointer group shadow-lg border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/60 snap-start flex flex-col items-center justify-center gap-3 transition-colors outline-none"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-800 transition-colors">
                <ChevronRight className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                View All
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentaryList;
