import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft, Play, Clock, Plus, Check, Share2, Cast, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    getDocumentData,
    getSignedUrl,
    getMatchingData,
    createDocument,
    deleteDocument,
    compoundQuery
} from '@/Firebase';

const Episode = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const userId = user?.id || user?.uid;

    const [show, setShow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState(0);
    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
    const [isInMyList, setIsInMyList] = useState(false);
    const [isListToggling, setIsListToggling] = useState(false);
    const [relatedShows, setRelatedShows] = useState([]);
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsSeasonDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch show details, sign URLs, and set state
    useEffect(() => {
        const fetchShowDetails = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const data = await getDocumentData("media", id);
                if (data) {
                    let signedThumb = data.thumbnailUrl || "";
                    if (signedThumb) {
                        try {
                            signedThumb = await getSignedUrl(data.thumbnailUrl);
                        } catch (err) {
                            console.error("Error signing show thumbnail URL:", err);
                        }
                    }

                    // Sign all episode thumbnails
                    const signedSeasons = data.seasons ? await Promise.all(
                        data.seasons.map(async (season) => {
                            if (season.episodes) {
                                const signedEpisodes = await Promise.all(
                                    season.episodes.map(async (ep) => {
                                        let epThumb = ep.thumbnailUrl || "";
                                        if (epThumb) {
                                            try {
                                                epThumb = await getSignedUrl(ep.thumbnailUrl);
                                            } catch (err) {
                                                console.error("Error signing episode URL:", err);
                                            }
                                        }
                                        return { ...ep, signedThumbnailUrl: epThumb };
                                    })
                                );
                                return { ...season, episodes: signedEpisodes };
                            }
                            return season;
                        })
                    ) : [];

                    setShow({
                        ...data,
                        signedThumbnailUrl: signedThumb,
                        seasons: signedSeasons
                    });
                }
            } catch (error) {
                console.error("Error fetching TV Show details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchShowDetails();
    }, [id]);

    // Check watchlist (My List) state
    useEffect(() => {
        if (!show) return;

        const checkMyList = async () => {
            const showIdStr = show.id.toString();
            if (userId) {
                try {
                    const listDocs = await compoundQuery("my_list", [
                        { key: "userId", operator: "==", value: userId }
                    ]);
                    const ids = listDocs.map((d) => d.movieId?.toString() || "");
                    setIsInMyList(ids.includes(showIdStr));
                } catch (err) {
                    console.error("Error loading watchlist state from DB:", err);
                    setIsInMyList(false);
                }
            } else {
                try {
                    const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
                    const ids = JSON.parse(myListDataStr);
                    setIsInMyList(ids.includes(showIdStr));
                } catch (err) {
                    console.error("Error loading local watchlist:", err);
                    setIsInMyList(false);
                }
            }
        };

        checkMyList();
    }, [show, userId]);

    // Fetch related content (TV Shows or fallback to Movies if none other exist)
    useEffect(() => {
        if (!show) return;

        const fetchRelated = async () => {
            try {
                const allShows = await getMatchingData("media", "category", "==", "TV Show");
                let filtered = allShows.filter((s) => s.id !== show.id);

                // If no other TV Shows, fetch Movies instead for related section
                if (filtered.length === 0) {
                    const allMovies = await getMatchingData("media", "category", "==", "Movie");
                    filtered = allMovies;
                }

                const limited = filtered.slice(0, 6);
                const signedFiltered = await Promise.all(
                    limited.map(async (s) => {
                        let signedThumb = s.thumbnailUrl || "";
                        if (signedThumb) {
                            try {
                                signedThumb = await getSignedUrl(s.thumbnailUrl);
                            } catch (err) {
                                console.error("Error signing URL:", err);
                            }
                        }
                        return { ...s, signedThumbnailUrl: signedThumb };
                    })
                );
                setRelatedShows(signedFiltered);
            } catch (err) {
                console.error("Error fetching related shows:", err);
            }
        };

        fetchRelated();
    }, [show]);

    // Watchlist toggle handler
    const handleToggleMyList = async () => {
        if (!show || isListToggling) return;
        setIsListToggling(true);

        const showIdStr = show.id.toString();
        if (userId) {
            const docId = `${userId}_${showIdStr}`;
            if (isInMyList) {
                try {
                    await deleteDocument("my_list", docId);
                    setIsInMyList(false);
                } catch (err) {
                    console.error("Error removing from My List in DB:", err);
                }
            } else {
                try {
                    const payload = {
                        id: docId,
                        userId,
                        movieId: showIdStr,
                        addedAt: new Date().toISOString(),
                        title: show.title,
                        image: show.thumbnailUrl || "",
                        category: show.category || "TV Show",
                        year: show.releaseYear?.toString() || "N/A",
                        rating: show.ageRating || "PG-13",
                        duration: show.duration || "N/A"
                    };
                    await createDocument("my_list", docId, payload);
                    setIsInMyList(true);
                } catch (err) {
                    console.error("Error adding to My List in DB:", err);
                }
            }
        } else {
            try {
                const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
                let myList = JSON.parse(myListDataStr);
                if (isInMyList) {
                    myList = myList.filter((item) => item !== showIdStr);
                    setIsInMyList(false);
                } else {
                    myList.push(showIdStr);
                    setIsInMyList(true);
                }
                localStorage.setItem('avr_my_list', JSON.stringify(myList));
            } catch (err) {
                console.error("Error toggling local watchlist:", err);
            }
        }
        setIsListToggling(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-24 px-4 animate-pulse">
                <div className="max-w-md mx-auto space-y-6">
                    <Skeleton className="w-full aspect-video rounded-xl bg-zinc-900" />
                    <Skeleton className="h-8 w-48 rounded bg-zinc-900" />
                    <div className="flex gap-4">
                        <Skeleton className="h-12 flex-1 rounded bg-zinc-900" />
                        <Skeleton className="h-12 flex-1 rounded bg-zinc-900" />
                    </div>
                    <Skeleton className="h-10 w-full rounded bg-zinc-900" />
                    <div className="space-y-4 pt-6">
                        <div className="flex gap-4 overflow-x-auto">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="w-48 aspect-video rounded bg-zinc-900 shrink-0" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!show) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <h2 className="text-xl font-bold mb-4">TV Show not found</h2>
                <Button onClick={() => navigate(-1)} className="bg-white text-black hover:bg-zinc-200">
                    Go Back
                </Button>
            </div>
        );
    }

    const currentSeason = show.seasons && show.seasons[selectedSeason];
    const episodes = currentSeason ? currentSeason.episodes : [];

    return (
        <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 relative select-none">

            {/* Top Video/Banner Header Section */}
            <div className="relative w-full aspect-video bg-black overflow-hidden border-b border-zinc-900">
                <img
                    src={show.signedThumbnailUrl || "/assets/poster.png"}
                    alt={show.title}
                    className="w-full h-full object-cover opacity-80"
                />

                {/* Cinematic gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-[2]" />

                {/* Back and Utility Header buttons */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 rounded-full bg-black/55 border border-zinc-900/60 text-white hover:bg-black/85 transition-all cursor-pointer flex items-center justify-center"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <button className="p-2.5 rounded-full bg-black/55 border border-zinc-900/60 hover:bg-black/85 text-white transition-all cursor-pointer">
                            <Cast className="w-5 h-5 text-white" />
                        </button>
                        <button className="p-2.5 rounded-full bg-black/55 border border-zinc-900/60 hover:bg-black/85 text-white transition-all cursor-pointer">
                            <Share2 className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Big play button overlay in center */}
                <div className="absolute inset-0 flex items-center justify-center z-[3]">
                    <button
                        onClick={() => navigate(`/video/${show.id}`)}
                        className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all border-2 border-white/20 cursor-pointer shadow-lg active:scale-95"
                    >
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </button>
                </div>
            </div>

            {/* Main Details and Sections wrapper */}
            <div className="max-w-md mx-auto px-4 pt-4 space-y-5">

                {/* Title and Metadata Details */}
                <div className="text-left space-y-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">{show.title}</h1>
                    <div className="flex items-center flex-wrap gap-2 text-xs font-bold text-zinc-400">
                        <span className="text-secondary-foreground font-bold flex items-center gap-0.5">⭐ {show.rating || "4.5"}</span>
                        <span className="text-green-500 font-bold">98% Match</span>
                        <span>{show.releaseYear}</span>
                        <span className="px-1.5 py-0.5 border border-zinc-700 rounded text-[10px] uppercase">{show.ageRating || "PG-13"}</span>
                        <span>{show.seasons ? `${show.seasons.length} Seasons` : "1 Season"}</span>
                        <span className="px-1.5 py-0.5 border border-zinc-700 text-zinc-350 rounded text-[9px] font-bold">4K</span>
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => navigate(`/video/${show.id}`)}
                        className="flex-1 bg-white hover:bg-white/95 text-black font-semibold py-5 rounded-md cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
                    >
                        <Play className="w-4 h-4 fill-current text-black" />
                        <span>Play S1·E1</span>
                    </Button>
                    <Button
                        onClick={handleToggleMyList}
                        disabled={isListToggling}
                        variant="outline"
                        className="flex-1 bg-zinc-900/80 border-zinc-800 text-white hover:bg-zinc-850 hover:text-white font-semibold py-5 rounded-md cursor-pointer disabled:opacity-55"
                    >
                        {isInMyList ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        <span>{isInMyList ? "In My List" : "My List"}</span>
                    </Button>


                </div>

                {/* Season Selector Tabs */}
                {show.seasons && show.seasons.length > 0 && (
                    <Tabs
                        value={selectedSeason.toString()}
                        onValueChange={(val) => setSelectedSeason(parseInt(val, 10))}
                        className="w-full text-left"
                    >
                        <TabsList className="bg-transparent p-0 flex gap-3 w-full justify-start overflow-x-auto scrollbar-hide mb-4">
                            {show.seasons.map((season, idx) => (
                                <TabsTrigger
                                    key={idx}
                                    value={idx.toString()}
                                    className="flex-1 max-w-[150px] border border-zinc-800 text-zinc-400 rounded-md py-2.5 text-xs font-bold text-center transition-all cursor-pointer hover:text-white data-[state=active]:border-primary data-[state=active]:text-white data-[state=active]:bg-transparent shadow-none"
                                >
                                    Season {idx + 1}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {show.seasons.map((season, idx) => (
                            <TabsContent key={idx} value={idx.toString()} className="mt-0 focus-visible:outline-none space-y-3">
                                {/* Vertical Episode List Cards */}
                                {(season.episodes || []).map((ep) => (
                                    <div
                                        key={ep.id}
                                        onClick={() => navigate(`/video/${show.id}`)}
                                        className="flex gap-4 items-center bg-zinc-900/30 border border-zinc-850 p-3 rounded-lg hover:bg-zinc-900/60 transition-colors cursor-pointer group shadow-sm"
                                    >
                                        {/* Left: Episode Thumbnail */}
                                        <div className="relative w-28 sm:w-36 aspect-video rounded-md overflow-hidden bg-zinc-950 shrink-0 shadow-sm">
                                            <img
                                                src={ep.signedThumbnailUrl || show.signedThumbnailUrl || "/assets/poster.png"}
                                                alt={ep.title}
                                                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-350"
                                            />
                                            {/* Play overlay on hover */}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Play className="w-5 h-5 text-white fill-white" />
                                            </div>
                                        </div>

                                        {/* Middle: Episode Info & Description */}
                                        <div className="flex-1 min-w-0 text-left space-y-1">
                                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                                                E{ep.episodeNumber} - {ep.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold">
                                                <span>{ep.duration || "22m"}</span>
                                                <span className="px-1.5 py-0.25 border border-zinc-800 text-[8px] bg-zinc-900/65 rounded font-extrabold text-zinc-350 uppercase">4K</span>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-zinc-500 leading-normal font-medium line-clamp-2">
                                                {ep.description || `Episode ${ep.episodeNumber} of ${show.title}. Enjoy the premium streaming experience on AVR Cinema.`}
                                            </p>
                                        </div>

                                        {/* Right: Download Icon button */}

                                    </div>
                                ))}
                            </TabsContent>
                        ))}
                    </Tabs>
                )}

                {/* Description Section */}
                <div className="text-left space-y-1.5 border-t border-zinc-900 pt-4">
                    <h2 className="text-sm font-extrabold text-zinc-350 flex items-center">
                        Description <ChevronDown className="w-3.5 h-3.5 ml-1 select-none text-zinc-500" />
                    </h2>
                    <p className="text-zinc-400 text-xs leading-relaxed font-normal animate-in fade-in duration-200">
                        {isDescExpanded ? show.description : `${show.description?.slice(0, 150) || ""}${show.description?.length > 150 ? "..." : ""}`}
                        {show.description && show.description.length > 150 && (
                            <button
                                onClick={() => setIsDescExpanded(!isDescExpanded)}
                                className="text-primary font-semibold ml-1 hover:underline focus:outline-none cursor-pointer"
                            >
                                {isDescExpanded ? " less" : " more"}
                            </button>
                        )}
                    </p>
                </div>

                {/* Cast & Crew Section */}
                {show.cast && show.cast.length > 0 && (
                    <div className="text-left space-y-3 border-t border-zinc-900 pt-4">
                        <h2 className="text-sm font-extrabold text-zinc-350 flex items-center">
                            Cast & Crew <ChevronDown className="w-3.5 h-3.5 ml-1 select-none text-zinc-500" />
                        </h2>

                        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                            {show.cast.map((member, index) => (
                                <div key={index} className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                                        <img
                                            src={member.imageUrl || "/assets/cast1.webp"}
                                            alt={member.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-450 text-center w-14 truncate">
                                        {member.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Related TV Shows Section */}
                {relatedShows.length > 0 && (
                    <div className="text-left space-y-3 border-t border-zinc-900 pt-4">
                        <h2 className="text-sm font-extrabold text-zinc-350 flex items-center">
                            Related <ChevronDown className="w-3.5 h-3.5 ml-1 select-none text-zinc-500" />
                        </h2>

                        <div className="grid grid-cols-2 gap-3 pb-8">
                            {relatedShows.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        navigate(`/tv/episode/${item.id}`);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="relative aspect-video rounded-lg overflow-hidden border border-zinc-900 cursor-pointer group shadow-sm bg-zinc-950"
                                >
                                    <img
                                        src={item.signedThumbnailUrl || "/assets/poster.png"}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-bold text-white z-10">
                                        <span className="truncate max-w-[80%]">{item.title}</span>
                                        <span className="text-[8px] text-zinc-400 shrink-0 bg-black/60 px-1 py-0.25 rounded">
                                            {item.releaseYear || "2020"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Episode;