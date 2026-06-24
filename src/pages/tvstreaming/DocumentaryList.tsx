import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Check, Film, Play } from 'lucide-react';
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { fetchDocumentaryMedia } from "@/store/slices/documentarySlice";
import { getSignedUrl } from '@/Firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';

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

  if (items.length === 0) {
    if (isGrid) {
      return (
        <Empty className="py-20 border border-dashed border-zinc-805/40 bg-zinc-950/25 rounded-2xl my-4">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-primary/10 text-primary animate-pulse">
              <Film className="w-6 h-6 text-primary" />
            </EmptyMedia>
            <EmptyTitle className="text-white font-semibold text-lg">No Documentaries added yet</EmptyTitle>
            <EmptyDescription className="text-zinc-500 max-w-[340px] mx-auto text-xs">
              There are currently no Documentaries available in this section.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }
    return null;
  }

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
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4 pb-40">
                {genreItems.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex-none w-full relative group/card"
                    style={{ zIndex: 1 }}
                    onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                    onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
                  >
                    {/* Poster */}
                    <div
                      tabIndex={0}
                      className="focusable w-full aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/card:scale-105"
                      onClick={() => navigate(`/video/${doc.id}`)}
                    >
                      <img src={doc.signedThumbnailUrl || "/assets/poster.png"} alt={doc.title} loading="lazy" className="w-full h-full object-cover" />
                    </div>

                    {/* Floating Popup */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto transition-all duration-200 rounded-xl overflow-hidden bg-zinc-900 shadow-2xl shadow-black/80 border border-zinc-700/80 z-50">
                      <div className="w-full aspect-video overflow-hidden relative">
                        <img src={doc.signedThumbnailUrl || "/assets/poster.png"} alt={doc.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                        <div className="absolute bottom-2 left-3 right-3">
                          <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-lg">{doc.title}</p>
                        </div>
                      </div>
                      <div className="p-3 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                          <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); navigate(`/video/${doc.id}`); }} className="focusable flex-1 py-1.5 bg-white text-black hover:bg-zinc-200 rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors">
                            <Play className="w-3.5 h-3.5 fill-current" /> Watch Now
                          </button>
                          <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); if (toggleWatchlist) toggleWatchlist(doc.id, doc); }} className="focusable w-8 h-8 bg-zinc-800 border border-zinc-700 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow">
                            {watchlist.includes(doc.id.toString()) ? <Check className="w-3.5 h-3.5 text-[#DECB94]" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 flex-wrap leading-tight select-none">
                          <span className="text-white">{doc.releaseYear || doc.year || 2026}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="px-1 border border-zinc-600 rounded text-[9px] leading-snug py-0.5 text-zinc-300">{doc.ageRating || doc.rating || "U/A"}</span>
                          <span className="text-zinc-600">•</span>
                          <span>{doc.seasons && doc.seasons.length > 0 ? `${doc.seasons.length} Seasons` : (doc.duration || "N/A")}</span>
                          {doc.language && <><span className="text-zinc-600">•</span><span>{doc.language}</span></>}
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-4 leading-relaxed">{doc.description || "No description available."}</p>
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
          className="flex overflow-x-auto overflow-y-visible pb-2.5 md:pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth gap-3"
          style={{
            overflowY: 'visible',
            paddingTop: '80px',
            marginTop: '-80px',
            paddingBottom: '180px',
            marginBottom: '-180px'
          }}
        >
          {items.slice(0, 15).map((doc, index) => {
            const isFirst = index === 0;
            const isLast = index === Math.min(items.length, 15) - 1;

            return (
              <div 
                key={doc.id}
                className="flex-none w-[130px] sm:w-[165px] md:w-[190px] lg:w-[210px] snap-start relative group/card"
                style={{ zIndex: 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.zIndex = '50')}
                onMouseLeave={(e) => (e.currentTarget.style.zIndex = '1')}
              >
                {/* Poster */}
                <div
                  tabIndex={0}
                  className="focusable w-full aspect-[2/3] rounded-md overflow-hidden cursor-pointer shadow-lg border border-zinc-900 bg-zinc-950 outline-none transition-all duration-300 group-hover/card:scale-105"
                  onClick={() => navigate(`/video/${doc.id}`)}
                >
                  <img src={doc.signedThumbnailUrl || "/assets/poster.png"} alt={doc.title} loading="lazy" className="w-full h-full object-cover" />
                </div>

                {/* Floating Popup */}
                <div
                  className={`absolute top-1/2 w-[340px] opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto transition-all duration-200 rounded-xl overflow-hidden bg-zinc-900 shadow-2xl shadow-black/80 border border-zinc-700/80 z-50 ${
                    isFirst
                      ? "left-0 translate-x-0 -translate-y-1/2 origin-left"
                      : isLast
                      ? "right-0 left-auto translate-x-0 -translate-y-1/2 origin-right"
                      : "left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
                  }`}
                >
                <div className="w-full aspect-video overflow-hidden relative">
                  <img src={doc.signedThumbnailUrl || "/assets/poster.png"} alt={doc.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-white font-bold text-sm leading-tight truncate drop-shadow-lg">{doc.title}</p>
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); navigate(`/video/${doc.id}`); }} className="focusable flex-1 py-1.5 bg-white text-black hover:bg-zinc-200 rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-colors">
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Now
                    </button>
                    <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); if (toggleWatchlist) toggleWatchlist(doc.id, doc); }} className="focusable w-8 h-8 bg-zinc-800 border border-zinc-700 text-white rounded-full hover:bg-zinc-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow">
                      {watchlist.includes(doc.id.toString()) ? <Check className="w-3.5 h-3.5 text-[#DECB94]" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 flex-wrap leading-tight select-none">
                    <span className="text-white">{doc.releaseYear || doc.year || 2026}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="px-1 border border-zinc-600 rounded text-[9px] leading-snug py-0.5 text-zinc-300">{doc.ageRating || doc.rating || "U/A"}</span>
                    <span className="text-zinc-600">•</span>
                    <span>{doc.seasons && doc.seasons.length > 0 ? `${doc.seasons.length} Seasons` : (doc.duration || "N/A")}</span>
                    {doc.language && <><span className="text-zinc-600">•</span><span>{doc.language}</span></>}
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-4 leading-relaxed">{doc.description || "No description available."}</p>
                </div>
              </div>
            </div>
          );
        })}
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
