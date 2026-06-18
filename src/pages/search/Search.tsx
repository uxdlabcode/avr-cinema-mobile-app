import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search as SearchIcon, X, Play, TrendingUp, Film } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    fetchInitialHistory,
    saveSearch,
    deleteSearch,
    clearHistory
} from '@/store/slices/searchSlice';
import { fetchAllMedia } from '@/store/slices/mediaSlice';
import type { RootState, AppDispatch } from '@/store';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ALL_GENRES = [
    'Action', 'Comedy', 'Drama', 'Sci-Fi',
    'Horror', 'Romance', 'Thriller', 'Fantasy',
    'Animation', 'Documentary', 'Mystery', 'Adventure'
];

// Helper to get thumbnail from varied data structures
const getThumbnail = (media: any) => {
    return media?.signedThumbnailUrl ||
        media?.image ||
        media?.thumbnailUrl ||
        media?.poster_url ||
        media?.thumbnail ||
        media?.seasons?.[0]?.signedThumbnailUrl ||
        media?.seasons?.[0]?.thumbnailUrl ||
        media?.seasons?.[0]?.episodes?.[0]?.thumbnailUrl ||
        '';
};

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlQuery = searchParams.get('q') || '';
    const [query, setQuery] = useState(urlQuery);
    const [isSearching, setIsSearching] = useState(false);

    const [filteredMedia, setFilteredMedia] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>('India');

    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    
    // Redux selectors
    const { history } = useSelector((state: RootState) => state.search);
    const user = useSelector((state: RootState) => state.auth.user);
    const allMedia = useSelector((state: RootState) => state.media.items);
    const mediaStatus = useSelector((state: RootState) => state.media.status);
    const mediaError = useSelector((state: RootState) => state.media.error);

    const isLoadingMedia = mediaStatus === 'loading' || mediaStatus === 'idle';

    useEffect(() => {
        setQuery(urlQuery);
    }, [urlQuery]);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchInitialHistory(user.id));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (mediaStatus === 'idle') {
            dispatch(fetchAllMedia());
        }
    }, [mediaStatus, dispatch]);

    // Dynamically filter the grid based on BOTH activeFilter and query
    useEffect(() => {
        if (!allMedia.length) return;

        setIsSearching(true);

        const timeoutId = setTimeout(() => {
            let result = allMedia;

            // 1. Filter by Active Chip
            if (activeFilter === 'India') {
                // Keep all
            } else if (activeFilter === 'Movies') {
                result = result.filter(m => m.category === 'Movie');
            } else if (activeFilter === 'Shows') {
                result = result.filter(m => m.category === 'TV Show' || m.category === 'Series');
            } else {
                result = result.filter(m =>
                    (m.genres && m.genres.includes(activeFilter)) || m.genre === activeFilter
                );
            }

            // 2. Filter by Query
            if (query.trim()) {
                const lowerQuery = query.toLowerCase();
                result = result.filter(m =>
                    m.title?.toLowerCase().includes(lowerQuery) ||
                    m.description?.toLowerCase().includes(lowerQuery) ||
                    (m.genres && m.genres.some((g: string) => g.toLowerCase().includes(lowerQuery)))
                );
            }

            setFilteredMedia(result);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, activeFilter, allMedia]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim() && user?.id) {
            dispatch(saveSearch({ uid: user.id, query: query.trim() }));
        }
    };

    const handleChipClick = (itemQuery: string) => {
        setQuery(itemQuery);
        setSearchParams(itemQuery.trim() ? { q: itemQuery.trim() } : {});
        if (itemQuery.trim() && user?.id) {
            dispatch(saveSearch({ uid: user.id, query: itemQuery.trim() }));
        }
    };

    const handleFilterClick = (chip: string) => {
        setActiveFilter(chip);
    };

    const clearSearchState = () => {
        setQuery('');
        setSearchParams({});
    };

    const renderChips = () => {
        const chips = ['India', 'Movies', 'Shows', ...ALL_GENRES];
        return (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {chips.map((chip) => (
                    <button
                        key={chip}
                        onClick={() => handleFilterClick(chip)}
                        className={`focusable flex items-center gap-1.5 px-1 py-0.5 rounded-md border text-sm font-medium whitespace-nowrap transition-colors outline-none ${activeFilter === chip
                            ? 'bg-zinc-800 text-white border-zinc-700'
                            : 'bg-transparent text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                            }`}
                    >
                        {chip === 'India' && <TrendingUp className="w-4 h-4" />}
                        {chip}
                    </button>
                ))}
            </div>
        );
    };

    const getBadge = (index: number) => {
        if (index % 4 === 0) {
            return (
                <span className="absolute top-2 left-2 z-10 bg-[#E50914] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shadow select-none">
                    HOT
                </span>
            );
        }
        if (index % 4 === 1) {
            return (
                <span className="absolute top-2 left-2 z-10 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shadow select-none">
                    TRENDING
                </span>
            );
        }
        if (index % 4 === 2) {
            return (
                <span className="absolute top-2 left-2 z-10 bg-[#1e40af] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shadow select-none">
                    NEW SERIES
                </span>
            );
        }
        return (
            <span className="absolute top-2 left-2 z-10 bg-[#d97706] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shadow select-none">
                HIDDEN GEMS
            </span>
        );
    };

    return (
        <>
            {/* MOBILE LAYOUT (Remains exactly same) */}
            <div className="md:hidden min-h-screen bg-[#0f1014] text-white pb-24 w-full">
                {/* STICKY TOP SECTION */}
                <div className="sticky top-0 z-50 bg-[#0f1014] pt-4 px-4 shadow-sm mb-2">
                    <div className="max-w-7xl mx-auto space-y-4 pt-4">
                        {/* Search Header */}
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold text-white">Search</h1>
                            <p className="text-zinc-400 text-sm hidden sm:block">Find your favorite movies, TV shows, and more.</p>
                        </div>

                        {/* Search Input Bar */}
                        <form tabIndex={-1} onSubmit={handleSearchSubmit} className="relative w-full group mb-2">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-white transition-colors" />
                            <Input
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setQuery(val);
                                    setSearchParams(val.trim() ? { q: val.trim() } : {}, { replace: true });
                                }}
                                placeholder="Search for movies, shows..."
                                className="pl-12 pr-12 bg-[#0f1014] border rounded-md h-9 text-base"
                                disabled={isLoadingMedia}
                            />
                            {isSearching ? (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Spinner size="sm" />
                                </div>
                            ) : query.length > 0 ? (
                                <button
                                    tabIndex={-1}
                                    type="button"
                                    onClick={clearSearchState}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            ) : null}
                        </form>
                    </div>

                    {/* Gradient blend */}
                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-transparent translate-y-full pointer-events-none" />
                </div>

                {/* SCROLLABLE MAIN CONTENT */}
                <div className="max-w-7xl mx-auto px-4 pt-6 space-y-2 mt-2">
                    {/* Recent Searches Section - Show when query is empty */}
                    {query.trim().length === 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white tracking-wide">Recent Searches</h2>
                                {history.length > 0 && (
                                    <button
                                        onClick={() => user?.id && dispatch(clearHistory(user.id))}
                                        className="focusable text-xs font-bold text-blue-500 hover:text-blue-400"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {history.length > 0 ? (
                                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                                    {history.map((item) => {
                                        const matchedMovie = allMedia.find(m => m.title?.toLowerCase() === item.query.toLowerCase() || m.title?.toLowerCase().includes(item.query.toLowerCase()));
                                        const displayImage = matchedMovie ? getThumbnail(matchedMovie) : null;

                                        return (
                                            <div
                                                key={item.id}
                                                tabIndex={0}
                                                className="focusable relative w-[140px] aspect-video rounded-md overflow-hidden flex-shrink-0 cursor-pointer group bg-zinc-900 border border-zinc-800/50 hover:border-zinc-600 transition-colors"
                                                onClick={() => handleChipClick(item.query)}
                                            >
                                                {displayImage ? (
                                                    <img src={displayImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-650 group-hover:text-zinc-400 transition-colors">
                                                        <SearchIcon className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2">
                                                    <div className="flex justify-end">
                                                        <button
                                                            tabIndex={-1}
                                                            className="p-1 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                dispatch(deleteSearch(item.id));
                                                            }}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="mt-auto">
                                                        <span className="text-xs font-bold text-white line-clamp-1">{item.query}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 italic">Your recent searches will appear here...</p>
                            )}
                        </div>
                    )}

                    {/* Filter Chips - Always Visible Now */}
                    <div className="pt-2">
                        <h2 className="text-lg font-bold text-white tracking-wide mb-3">Trending in</h2>
                        {renderChips()}
                    </div>

                    {/* Default View Grid - Always used now */}
                    {isLoadingMedia ? (
                        <div className="grid grid-cols-3 gap-2 pb-4">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className={`w-full aspect-[2/3] rounded-md bg-zinc-800/50 ${i % 9 === 6 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
                                />
                            ))}
                        </div>
                    ) : filteredMedia.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-zinc-800/50 rounded-2xl bg-zinc-900/20">
                            <div className="bg-zinc-800/50 p-4 rounded-full mb-4">
                                {query.trim() ? <SearchIcon className="w-8 h-8 text-zinc-500" /> : <Film className="w-8 h-8 text-zinc-500" />}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Content Found</h3>
                            <p className="text-zinc-400 text-sm max-w-sm">
                                {query.trim()
                                    ? <>We couldn't find any matches for <span className="text-white font-medium">"{query}"</span> in <span className="text-white font-medium">{activeFilter}</span>.</>
                                    : <>We couldn't find any media matching the <span className="text-white font-medium">"{activeFilter}"</span> category.</>
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 pb-4 mt-4">
                            {filteredMedia.map((movie, index) => {
                                const thumb = getThumbnail(movie);
                                const isLarge = index % 9 === 6;
                                return (
                                    <div
                                        key={movie.id}
                                        tabIndex={0}
                                        className={`focusable relative rounded-md overflow-hidden group cursor-pointer bg-zinc-900 transition-transform duration-300 hover:scale-[1.02] hover:z-10 ${isLarge ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}`}
                                        onClick={() => {
                                            if (query.trim() && user?.id) {
                                                dispatch(saveSearch({ uid: user.id, query: query.trim() }));
                                            }
                                            navigate('/video/' + movie.id);
                                        }}
                                    >
                                        {thumb ? (
                                            <img
                                                src={thumb}
                                                alt={movie.title || 'Media'}
                                                className="w-full h-full object-cover aspect-[2/3]"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/assets/poster.png';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full aspect-[2/3] bg-zinc-800 flex items-center justify-center">
                                                <Film className="w-8 h-8 text-zinc-600" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            <span className="text-[10px] sm:text-xs font-bold text-white truncate">{movie.title}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* DESKTOP/LARGE SCREEN LAYOUT */}
            <div className="hidden md:block fixed inset-0 bg-[#0b0c0e] text-white z-[100] overflow-y-auto pb-24 w-full">
                <div className="max-w-6xl mx-auto px-6 pt-16 flex flex-col items-center">
                    {/* Search Input Bar & Close Button */}
                    <div className="flex items-center gap-6 w-full max-w-3xl mb-8">
                        <form tabIndex={-1} onSubmit={handleSearchSubmit} className="relative flex-1 group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-white transition-colors" />
                            <Input
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setQuery(val);
                                    setSearchParams(val.trim() ? { q: val.trim() } : {}, { replace: true });
                                }}
                                placeholder="Search for a TV Shows, Movie & Genre etc"
                                className="focusable pl-12 pr-12  h-10 text-base w-full text-white placeholder-zinc-500 focus:bg-zinc-800"
                                disabled={isLoadingMedia}
                            />
                            {/* <button
                                tabIndex={-1}
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                title="Voice Search"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                                </svg>
                            </button> */}
                        </form>

                        <button
                            onClick={() => {
                                if (window.history.length > 1) {
                                    navigate(-1);
                                } else {
                                    navigate('/dashboard');
                                }
                            }}
                            className="focusable p-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center bg-zinc-900/60 hover:bg-zinc-800 rounded-full border border-zinc-800 outline-none"
                            aria-label="Close search"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Category Cards - Display when query is empty */}
                    {query.trim().length === 0 && (
                        <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mb-12">
                            <button
                                onClick={() => navigate("/tv")}
                                className="focusable relative h-20 rounded-md overflow-hidden group cursor-pointer border border-purple-500/20 bg-gradient-to-br from-pink-650/40 to-purple-900/60 hover:from-pink-650/50 hover:to-purple-900/70 transition-all shadow-md flex items-center justify-center font-black tracking-wider text-xs text-white select-none outline-none"
                            >
                                <div className="absolute inset-0 bg-cover bg-center bg-[url('/assets/cast1.webp')] opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-300" />
                                <span className="relative drop-shadow-md">TV SHOWS</span>
                            </button>

                            <button
                                onClick={() => navigate("/movies")}
                                className="focusable relative h-20 rounded-md overflow-hidden group cursor-pointer border border-blue-500/20 bg-gradient-to-br from-blue-650/40 to-indigo-900/60 hover:from-blue-650/50 hover:to-indigo-900/70 transition-all shadow-md flex items-center justify-center font-black tracking-wider text-xs text-white select-none outline-none"
                            >
                                <div className="absolute inset-0 bg-cover bg-center bg-[url('/assets/cast2.webp')] opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-300" />
                                <span className="relative drop-shadow-md">MOVIES</span>
                            </button>

                            <button
                                onClick={() => navigate("/tv?tab=Documentaries")}
                                className="focusable relative h-20 rounded-md overflow-hidden group cursor-pointer border border-teal-500/20 bg-gradient-to-br from-teal-650/40 to-emerald-900/60 hover:from-teal-650/50 hover:to-emerald-900/70 transition-all shadow-md flex items-center justify-center font-black tracking-wider text-xs text-white select-none outline-none"
                            >
                                <div className="absolute inset-0 bg-cover bg-center bg-[url('/assets/cast3.jpg')] opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-300" />
                                <span className="relative drop-shadow-md">DOCUMENTARIES</span>
                            </button>
                        </div>
                    )}

                    {/* Recent Searches Section - Show when query is empty */}
                    {query.trim().length === 0 && (
                        <div className="w-full max-w-3xl space-y-4 mb-8 text-left">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white tracking-wide">Recent Searches</h2>
                                {history.length > 0 && (
                                    <button
                                        onClick={() => user?.id && dispatch(clearHistory(user.id))}
                                        className="focusable text-xs font-bold text-blue-500 hover:text-blue-400 cursor-pointer outline-none"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {history.length > 0 ? (
                                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                    {history.map((item) => {
                                        const matchedMovie = allMedia.find(m => m.title?.toLowerCase() === item.query.toLowerCase() || m.title?.toLowerCase().includes(item.query.toLowerCase()));
                                        const displayImage = matchedMovie ? getThumbnail(matchedMovie) : null;

                                        return (
                                            <div
                                                key={item.id}
                                                tabIndex={0}
                                                className="focusable relative w-[180px] aspect-video rounded-md overflow-hidden flex-shrink-0 cursor-pointer group bg-zinc-900 border border-zinc-800/50 hover:border-zinc-600 transition-colors outline-none"
                                                onClick={() => handleChipClick(item.query)}
                                            >
                                                {displayImage ? (
                                                    <img src={displayImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                        <SearchIcon className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2">
                                                    <div className="flex justify-end">
                                                        <button
                                                            tabIndex={-1}
                                                            className="p-1 rounded-full bg-black/50 hover:bg-black/80 text-white transition-colors z-10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                dispatch(deleteSearch(item.id));
                                                            }}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="mt-auto">
                                                        <span className="text-xs font-bold text-white line-clamp-1">{item.query}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 italic">Your recent searches will appear here...</p>
                            )}
                        </div>
                    )}

                    {/* Trending / Results Section */}
                    <div className="w-full max-w-3xl space-y-4 text-left">
                        <div className="space-y-3">
                            <h2 className="text-lg font-bold text-white tracking-wide">Trending in</h2>
                            {renderChips()}
                        </div>

                        {isLoadingMedia ? (
                            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4 mt-4">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <Skeleton
                                        key={i}
                                        className="w-full aspect-[2/3] rounded-md bg-zinc-800/50"
                                    />
                                ))}
                            </div>
                        ) : filteredMedia.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-zinc-800/50 rounded-2xl bg-zinc-900/20">
                                <div className="bg-zinc-800/50 p-4 rounded-full mb-4">
                                    {query.trim() ? <SearchIcon className="w-8 h-8 text-zinc-500" /> : <Film className="w-8 h-8 text-zinc-500" />}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No Content Found</h3>
                                <p className="text-zinc-400 text-sm max-w-sm">
                                    {query.trim()
                                        ? <>We couldn't find any matches for <span className="text-white font-medium">"{query}"</span> in <span className="text-white font-medium">{activeFilter}</span>.</>
                                        : <>We couldn't find any media matching the <span className="text-white font-medium">"{activeFilter}"</span> category.</>
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4 mt-4">
                                {filteredMedia.map((movie, index) => {
                                    const thumb = getThumbnail(movie);
                                    return (
                                        <div
                                            key={movie.id}
                                            tabIndex={0}
                                            className="focusable relative rounded-md overflow-hidden group cursor-pointer bg-zinc-900 transition-transform duration-300 hover:scale-[1.02] hover:z-10 outline-none"
                                            onClick={() => {
                                                if (query.trim() && user?.id) {
                                                    dispatch(saveSearch({ uid: user.id, query: query.trim() }));
                                                }
                                                navigate('/video/' + movie.id);
                                            }}
                                        >
                                            {getBadge(index)}

                                            {thumb ? (
                                                <img
                                                    src={thumb}
                                                    alt={movie.title || 'Media'}
                                                    className="w-full h-full object-cover aspect-[2/3]"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/assets/poster.png';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full aspect-[2/3] bg-zinc-800 flex items-center justify-center">
                                                    <Film className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                                <span className="text-[10px] sm:text-xs font-bold text-white truncate">{movie.title}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Search;