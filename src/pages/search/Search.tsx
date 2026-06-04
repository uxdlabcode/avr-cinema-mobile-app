import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search as SearchIcon, X, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    fetchInitialHistory,
    saveSearch,
    deleteSearch
} from '@/store/slices/searchSlice';
import type { RootState, AppDispatch } from '@/store';

// Mock Data
const TRENDING_IN_INDIA = [
    { id: 1, title: 'The Revenge', image: '/assets/poster.png' },
    { id: 2, title: 'Dhurandhar', image: '/assets/episode1.webp' },
    { id: 3, title: 'Tu Juliet Jatt Di', image: '/assets/episode2.webp' },
    { id: 4, title: 'Yeh Rishta', image: '/assets/poster.png' },
    { id: 5, title: 'Naagin', image: '/assets/episode1.webp' },
    { id: 6, title: 'Anupama', image: '/assets/episode2.webp' },
    { id: 7, title: 'Laughter Chefs', image: '/assets/poster.png' },
    { id: 8, title: 'Mannat', image: '/assets/episode1.webp' },
    { id: 9, title: 'Splitsvilla', image: '/assets/episode2.webp' },
];

const Search = () => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Using a more structured state for results to handle Hotstar's layout
    const [topResult, setTopResult] = useState<{ id: number; title: string; image: string; year: string; duration: string; genre: string } | null>(null);
    const [moreLikeThis, setMoreLikeThis] = useState<{ id: number; title: string; image: string }[]>([]);

    const dispatch = useDispatch<AppDispatch>();
    const { history } = useSelector((state: RootState) => state.search);
    const user = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchInitialHistory(user.id));
        }
    }, [dispatch, user]);

    const performSearch = (searchQuery: string) => {
        if (!searchQuery.trim() || !user?.id) return;

        setIsSearching(true);
        dispatch(saveSearch({ uid: user.id, query: searchQuery.trim() }));

        setTimeout(() => {
            // Mocking the Top Result
            setTopResult({
                id: 100,
                title: searchQuery,
                image: '/assets/episode2.webp', // Landscape fallback
                year: '2023',
                duration: '2h 15m',
                genre: 'Action • Drama • U/A 16+'
            });

            // Mocking the Grid Results
            setMoreLikeThis([
                { id: 101, title: 'Related 1', image: '/assets/poster.png' },
                { id: 102, title: 'Related 2', image: '/assets/episode1.webp' },
                { id: 103, title: 'Related 3', image: '/assets/episode2.webp' },
                { id: 104, title: 'Related 4', image: '/assets/poster.png' },
                { id: 105, title: 'Related 5', image: '/assets/episode1.webp' },
                { id: 106, title: 'Related 6', image: '/assets/episode2.webp' },
            ]);
            setIsSearching(false);
        }, 600);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(query);
    };

    const handleChipClick = (itemQuery: string) => {
        setQuery(itemQuery);
        performSearch(itemQuery);
    };

    const handleTrendingClick = (trendingTitle: string) => {
        setQuery(trendingTitle);
        performSearch(trendingTitle);
    };

    const clearSearch = () => {
        setQuery('');
        setTopResult(null);
        setMoreLikeThis([]);
    };

    return (
        <div className="min-h-screen bg-[#0f1014] text-white p-4 md:p-8 pb-24 w-full">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Search Header */}
                <div className="space-y-2">
                    <h1 className="text-xl font-bold text-primary">Search</h1>
                    <p className="text-muted-foreground text-sm">Find your favorite movies, TV shows, and more.</p>
                </div>

                {/* Search Input Bar */}
                <form onSubmit={handleSearchSubmit} className="relative w-full group">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-white transition-colors" />
                    <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Movies, shows and more"
                        className="pl-12 pr-12"
                        disabled={isSearching}
                    />
                    {isSearching ? (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Spinner size="sm" />
                        </div>
                    ) : query.length > 0 ? (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    ) : null}
                </form>

                {/* Search History Chips (Hotstar Style) */}
                {history.length > 0 && !topResult && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mt-2">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-full cursor-pointer whitespace-nowrap transition-colors border border-zinc-700/50"
                                onClick={() => handleChipClick(item.query)}
                            >
                                <SearchIcon className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-sm font-medium text-zinc-200">{item.query}</span>
                                <button
                                    className="ml-1 p-0.5 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(deleteSearch(item.id));
                                    }}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Main Content Area */}
                {!topResult ? (
                    /* Default View: Trending in India */
                    <div className="space-y-4 pt-2">
                        <h2 className="text-lg font-bold text-white tracking-wide">Trending in India</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {TRENDING_IN_INDIA.map((movie) => (
                                <div
                                    key={movie.id}
                                    className="relative aspect-[2/3] rounded-md overflow-hidden group cursor-pointer bg-zinc-900 transition-transform duration-300 hover:scale-105 hover:z-10"
                                    onClick={() => handleTrendingClick(movie.title)}
                                >
                                    <img
                                        src={movie.image}
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                        <span className="text-[10px] sm:text-xs font-bold text-white truncate">{movie.title}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Search Results View */
                    <div className="space-y-8 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Top Result Section */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Top Result</h2>

                            <div className="flex flex-col md:flex-row gap-6 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                                {/* Landscape Image Banner */}
                                <div className="w-full md:w-[400px] aspect-video rounded-xl overflow-hidden relative shadow-lg">
                                    <img
                                        src={topResult.image}
                                        alt={topResult.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>

                                {/* Top Result Metadata & Action */}
                                <div className="flex flex-col justify-center flex-1 space-y-3">
                                    <h3 className="text-3xl font-bold text-white">{topResult.title}</h3>
                                    <p className="text-sm font-medium text-zinc-400">
                                        {topResult.year} • {topResult.duration} • {topResult.genre}
                                    </p>

                                    <Button
                                        className="w-full md:w-64 mt-4 bg-white text-black hover:bg-zinc-200 font-bold text-base h-12 rounded-xl transition-all hover:scale-[1.02]"
                                    >
                                        <Play className="w-5 h-5 mr-2 fill-black" />
                                        Watch Now
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* More Like This Section */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-white tracking-wide">More Like This</h2>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {moreLikeThis.map((movie) => (
                                    <div
                                        key={movie.id}
                                        className="relative aspect-[2/3] rounded-md overflow-hidden group cursor-pointer bg-zinc-900 transition-transform duration-300 hover:scale-105 hover:z-10"
                                    >
                                        <img
                                            src={movie.image}
                                            alt={movie.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            <span className="text-[10px] sm:text-xs font-bold text-white truncate">{movie.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;