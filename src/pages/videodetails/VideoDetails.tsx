import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { serverTimestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { 
  Play, Plus, ChevronLeft, ChevronDown, Share2, Cast, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocumentData, getMatchingData, getSignedUrl, compoundQuery, deleteDocument, createDocument } from '@/Firebase';
import { CustomVideoPlayer } from './CustomVideoPlayer';

// Static movie data store as fallback
const MOVIES_DATA: Record<string, {
  id: string;
  title: string;
  image: string;
  year: string;
  duration: string;
  rating: string;
  quality: string;
  description: string;
  category: string;
  seasons: { label: string; episodes: { id: number; episodeNumber?: number; title: string; image: string; duration: string; videoUrl?: string }[] }[];
  cast: { name: string; image: string }[];
  related: { id: string | number; title: string; image: string }[];
  movieUrl?: string;
}> = {
  '1': {
    id: '1',
    title: 'Anweshippin Kandethum',
    image: '/assets/poster.png',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'Wrongfully suspended while pursuing the culprit in a missing persons case, a cop seeks redemption – and justice – when he gets a new assignment.',
    category: 'Movie',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'This Is What Happens', image: '/assets/episode1.webp', duration: '42m' },
          { id: 2, title: 'Good for the End', image: '/assets/episode2.webp', duration: '38m' },
          { id: 3, title: 'The Beginning', image: '/assets/poster.png', duration: '45m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: '2', title: 'The Office', image: '/assets/episode1.webp' },
      { id: '3', title: 'Lord of the Rings', image: '/assets/episode2.webp' },
      { id: '4', title: 'Stranger Things', image: '/assets/poster.png' },
      { id: '5', title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  },
  '2': {
    id: '2',
    title: 'The Office',
    image: '/assets/episode1.webp',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'A mockumentary on a group of typical office workers, where the weights of the day are carried by the employees.',
    category: 'TV Show',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'This Is What Happens', image: '/assets/episode1.webp', duration: '42m' },
          { id: 2, title: 'Good for the End', image: '/assets/episode2.webp', duration: '38m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: '1', title: 'Anweshippin Kandethum', image: '/assets/poster.png' },
      { id: '3', title: 'Lord of the Rings', image: '/assets/episode2.webp' },
      { id: '5', title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  },
  '3': {
    id: '3',
    title: 'Lord of the Rings',
    image: '/assets/episode2.webp',
    year: '2024',
    duration: '55 min',
    rating: 'A',
    quality: '4K',
    description: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth.',
    category: 'Movie',
    seasons: [
      {
        label: 'Season 1',
        episodes: [
          { id: 1, title: 'The Fellowship', image: '/assets/episode2.webp', duration: '178m' },
          { id: 2, title: 'The Two Towers', image: '/assets/episode1.webp', duration: '179m' },
        ]
      }
    ],
    cast: [
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast3.jpg' },
      { name: 'Rainn Wilson', image: '/assets/cast1.webp' },
      { name: 'Rainn Wilson', image: '/assets/cast2.webp' },
    ],
    related: [
      { id: '1', title: 'Anweshippin Kandethum', image: '/assets/poster.png' },
      { id: '2', title: 'The Office', image: '/assets/episode1.webp' },
      { id: '5', title: 'Breaking Bad', image: '/assets/episode1.webp' },
    ]
  }
};

// Fallback for any ID not in our data
const DEFAULT_MOVIE = MOVIES_DATA['1'];

const VideoDetailsSkeleton = () => (
  <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0 pt-2 px-4 animate-pulse">
    <div className="w-full aspect-video bg-zinc-900 rounded-lg mb-6" />
    <div className="px-4 md:px-8 max-w-4xl mx-auto space-y-6 pt-2">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1 mr-4">
          <div className="w-2/3 h-8 bg-zinc-900 rounded" />
          <div className="w-1/3 h-4 bg-zinc-900 rounded" />
        </div>
        <div className="w-16 h-8 bg-zinc-900 rounded" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 h-12 bg-zinc-900 rounded-lg" />
        <div className="flex-1 h-12 bg-zinc-900 rounded-lg" />
      </div>
      <div className="w-24 h-6 bg-zinc-900 rounded" />
      <div className="w-full h-24 bg-zinc-900 rounded-lg" />
    </div>
  </div>
);

const VideoDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id || "";
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [movie, setMovie] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Netflix-style player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrlToPlay, setVideoUrlToPlay] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [currentPlayingEpisodeTitle, setCurrentPlayingEpisodeTitle] = useState("");
  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  
  // Navigation tabs selection state
  const [activeTab, setActiveTab] = useState<'episodes' | 'related' | 'details'>('episodes');

  // Backdrop image loading state
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Reset image loading state on id navigation changes
  useEffect(() => {
    setIsImageLoading(true);
  }, [id]);

  // Watch progress state
  const [watchProgress, setWatchProgress] = useState<{ currentTime: number; duration: number; episodeId?: string|number } | null>(null);
  const [episodesProgress, setEpisodesProgress] = useState<Record<string, { currentTime: number; duration: number }>>({});

  // Watchlist (My List) states
  const [isInMyList, setIsInMyList] = useState<boolean>(false);
  const [isListToggling, setIsListToggling] = useState<boolean>(false);
  const [myListIds, setMyListIds] = useState<string[]>([]);

  // Reload watch progress when the movie ID changes or when player exits (isPlaying changes to false)
  useEffect(() => {
    if (!movie || isPlaying) return;
    
    const loadProgress = async () => {
      if (userId) {
        try {
          const saved = await getDocumentData("watch_progress", `${userId}_${movie.id}`);
          if (saved && saved.currentTime > 0 && saved.duration > 0) {
            setWatchProgress({
              currentTime: saved.currentTime,
              duration: saved.duration,
              episodeId: saved.episodeId
            });
            return;
          }
          setWatchProgress(null);
        } catch (err) {
          console.error("Error loading watch progress from DB:", err);
          setWatchProgress(null);
        }
      } else {
        try {
          const progressDataStr = localStorage.getItem('avr_watch_progress');
          if (progressDataStr) {
            const progressData = JSON.parse(progressDataStr);
            const saved = progressData[movie.id];
            if (saved && saved.currentTime > 0 && saved.duration > 0) {
              setWatchProgress(saved);
              return;
            }
          }
          setWatchProgress(null);
        } catch (err) {
          console.error("Error loading watch progress:", err);
          setWatchProgress(null);
        }
      }
    };

    loadProgress();
  }, [movie, isPlaying, userId]);

  // Load if this movie is in My List
  useEffect(() => {
    if (!movie) return;

    const checkMyList = async () => {
      if (userId) {
        try {
          const listDocs = await compoundQuery("my_list", [
            { key: "userId", operator: "==", value: userId }
          ]);
          const ids = listDocs.map((d: any) => d.movieId?.toString() || "");
          setMyListIds(ids);
          setIsInMyList(ids.includes(movie.id.toString()));
        } catch (err) {
          console.error("Error loading watchlist state from DB:", err);
          setIsInMyList(false);
          setMyListIds([]);
        }
      } else {
        try {
          const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
          const ids = JSON.parse(myListDataStr);
          setMyListIds(ids);
          setIsInMyList(ids.includes(movie.id.toString()));
        } catch (err) {
          console.error("Error loading local watchlist:", err);
          setIsInMyList(false);
          setMyListIds([]);
        }
      }
    };

    checkMyList();
  }, [movie, userId]);

  // Load progress of all episodes for this show
  useEffect(() => {
    if (!movie || isPlaying) return;

    const loadEpisodesProgress = async () => {
      if (userId && movie.category === "TV Show") {
        try {
          const docs = await compoundQuery("watch_progress", [
            { key: "userId", operator: "==", value: userId },
            { key: "movieId", operator: "==", value: movie.id }
          ]);
          
          const progressDict: Record<string, { currentTime: number; duration: number }> = {};
          docs.forEach((d: any) => {
            if (d.episodeId) {
              progressDict[d.episodeId.toString()] = {
                currentTime: d.currentTime,
                duration: d.duration
              };
            }
          });
          setEpisodesProgress(progressDict);
        } catch (err) {
          console.error("Error loading episodes progress from DB:", err);
        }
      } else {
        try {
          const progressDataStr = localStorage.getItem('avr_watch_progress');
          if (progressDataStr) {
            const progressData = JSON.parse(progressDataStr);
            const progressDict: Record<string, { currentTime: number; duration: number }> = {};
            
            Object.keys(progressData).forEach((key) => {
              if (key.startsWith(`${movie.id}_ep_`)) {
                const epId = key.replace(`${movie.id}_ep_`, "");
                const saved = progressData[key];
                if (saved) {
                  progressDict[epId] = {
                    currentTime: saved.currentTime,
                    duration: saved.duration
                  };
                }
              }
            });
            setEpisodesProgress(progressDict);
          } else {
            setEpisodesProgress({});
          }
        } catch (err) {
          console.error("Error loading local episodes progress:", err);
        }
      }
    };

    loadEpisodesProgress();
  }, [movie, isPlaying, userId]);

  const formatProgressTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEpisodeProgress = (epId: string | number) => {
    return episodesProgress[epId.toString()] || null;
  };

  const handleToggleMyList = async () => {
    if (!movie) return;
    setIsListToggling(true);
    
    const movieIdStr = movie.id.toString();
    if (userId) {
      const docId = `${userId}_${movieIdStr}`;
      if (isInMyList) {
        try {
          await deleteDocument("my_list", docId);
          setIsInMyList(false);
          setMyListIds(prev => prev.filter(id => id !== movieIdStr));
        } catch (err) {
          console.error("Error removing from My List in DB:", err);
        }
      } else {
        try {
          const payload = {
            id: docId,
            userId,
            movieId: movieIdStr,
            addedAt: serverTimestamp(),
            title: movie.title,
            image: movie.image,
            category: movie.category,
            year: movie.year,
            rating: movie.rating,
            duration: movie.duration
          };
          await createDocument("my_list", docId, payload);
          setIsInMyList(true);
          setMyListIds(prev => [...prev, movieIdStr]);
        } catch (err) {
          console.error("Error adding to My List in DB:", err);
        }
      }
    } else {
      // LocalStorage fallback
      try {
        const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
        let myList = JSON.parse(myListDataStr);
        if (isInMyList) {
          myList = myList.filter((item: string) => item !== movieIdStr);
          setIsInMyList(false);
          setMyListIds(prev => prev.filter(id => id !== movieIdStr));
        } else {
          myList.push(movieIdStr);
          setIsInMyList(true);
          setMyListIds(prev => [...prev, movieIdStr]);
        }
        localStorage.setItem('avr_my_list', JSON.stringify(myList));
      } catch (err) {
        console.error("Error toggling local watchlist:", err);
      }
    }
    setIsListToggling(false);
  };

  const handleToggleRelatedMyList = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (!item || isListToggling) return;
    setIsListToggling(true);
    
    const itemIdStr = item.id.toString();
    const isCurrentlyIn = myListIds.includes(itemIdStr);
    
    if (userId) {
      const docId = `${userId}_${itemIdStr}`;
      if (isCurrentlyIn) {
        try {
          await deleteDocument("my_list", docId);
          setMyListIds(prev => prev.filter(id => id !== itemIdStr));
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(false);
          }
        } catch (err) {
          console.error("Error removing related item from My List:", err);
        }
      } else {
        try {
          const payload = {
            id: docId,
            userId,
            movieId: itemIdStr,
            addedAt: serverTimestamp(),
            title: item.title,
            image: item.image,
            category: item.category || "Movie",
            year: item.year || "N/A",
            rating: item.rating || "PG-13",
            duration: item.duration || "N/A"
          };
          await createDocument("my_list", docId, payload);
          setMyListIds(prev => [...prev, itemIdStr]);
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(true);
          }
        } catch (err) {
          console.error("Error adding related item to My List:", err);
        }
      }
    } else {
      // LocalStorage fallback
      try {
        const myListDataStr = localStorage.getItem('avr_my_list') || '[]';
        let myList = JSON.parse(myListDataStr);
        if (isCurrentlyIn) {
          myList = myList.filter((id: string) => id !== itemIdStr);
          setMyListIds(prev => prev.filter(id => id !== itemIdStr));
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(false);
          }
        } else {
          myList.push(itemIdStr);
          setMyListIds(prev => [...prev, itemIdStr]);
          if (itemIdStr === movie.id.toString()) {
            setIsInMyList(true);
          }
        }
        localStorage.setItem('avr_my_list', JSON.stringify(myList));
      } catch (err) {
        console.error("Error toggling local watchlist for related item:", err);
      }
    }
    setIsListToggling(false);
  };

  useEffect(() => {
    const fetchMovieData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        // Reset player states
        setIsPlaying(false);
        setVideoUrlToPlay("");

        // 1. Try fetching from Firestore "media" collection
        const dbMovie = await getDocumentData("media", id);
        if (dbMovie) {
          let signedThumb = dbMovie.thumbnailUrl || "";
          if (signedThumb) {
            try {
              signedThumb = await getSignedUrl(dbMovie.thumbnailUrl);
            } catch (err) {
              console.error("Error signing URL:", err);
            }
          }

          // Map Firestore document structure to UI model
          const mappedMovie = {
            id: dbMovie.id,
            title: dbMovie.title,
            image: signedThumb || "/assets/poster.png",
            year: dbMovie.releaseYear?.toString() || "N/A",
            duration: dbMovie.duration || "N/A",
            rating: dbMovie.ageRating || "13+",
            quality: dbMovie.category === "Movie" ? "4K" : "HD",
            description: dbMovie.description || "",
            category: dbMovie.category,
            movieUrl: dbMovie.movieUrl || "",
            seasons: dbMovie.category === "TV Show" && dbMovie.seasons
              ? dbMovie.seasons.map((s: any) => ({
                  id: s.id,
                  label: s.label || `Season ${s.seasonNumber}`,
                  episodes: s.episodes ? s.episodes.map((ep: any) => ({
                    id: ep.id,
                    episodeNumber: ep.episodeNumber,
                    title: ep.title,
                    image: ep.thumbnailUrl || "/assets/episode1.webp",
                    duration: ep.duration || "N/A",
                    videoUrl: ep.videoUrl || ""
                  })) : []
                }))
              : [],
            cast: dbMovie.cast ? dbMovie.cast.map((c: any) => ({
              name: c.name,
              image: c.imageUrl || "/assets/cast1.webp"
            })) : [],
            related: [] as { id: string; title: string; image: string }[]
          };

          // Fetch related items from the same category dynamically
          try {
            const allOfCategory = await getMatchingData("media", "category", "==", dbMovie.category);
            const filtered = allOfCategory.filter(m => m.id !== dbMovie.id).slice(0, 4);
            
            // Sign the thumbnails of related items
            mappedMovie.related = await Promise.all(filtered.map(async (m) => {
              let signedRelatedThumb = m.thumbnailUrl || "";
              if (signedRelatedThumb) {
                try {
                  signedRelatedThumb = await getSignedUrl(m.thumbnailUrl);
                } catch (err) {
                  console.error("Error signing related thumb:", err);
                }
              }
              return {
                id: m.id,
                title: m.title,
                image: signedRelatedThumb || "/assets/poster.png",
                duration: m.duration || "N/A",
                category: m.category || "Movie",
                year: m.releaseYear?.toString() || "N/A"
              };
            }));
          } catch (relatedErr) {
            console.error("Error fetching related items:", relatedErr);
          }

          setMovie(mappedMovie);
          setActiveTab(mappedMovie.category === "TV Show" ? "episodes" : "related");
        } else if (MOVIES_DATA[id]) {
          setMovie(MOVIES_DATA[id]);
          setActiveTab(MOVIES_DATA[id].category === "TV Show" ? "episodes" : "related");
        } else {
          setMovie(DEFAULT_MOVIE);
          setActiveTab(DEFAULT_MOVIE.category === "TV Show" ? "episodes" : "related");
        }
      } catch (err) {
        console.error("Error loading movie data:", err);
        if (MOVIES_DATA[id]) {
          setMovie(MOVIES_DATA[id]);
          setActiveTab(MOVIES_DATA[id].category === "TV Show" ? "episodes" : "related");
        } else {
          setMovie(DEFAULT_MOVIE);
          setActiveTab(DEFAULT_MOVIE.category === "TV Show" ? "episodes" : "related");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovieData();
  }, [id]);


  const handlePlayClick = async (url: string, epInfo?: string) => {
    if (!url) return;
    try {
      setIsSigning(true);
      setCurrentPlayingEpisodeTitle(epInfo || "");
      const signed = await getSignedUrl(url);
      setVideoUrlToPlay(signed);
      setIsPlaying(true);
    } catch (err) {
      console.error("Error signing video stream URL:", err);
      setVideoUrlToPlay(url);
      setIsPlaying(true);
    } finally {
      setIsSigning(false);
    }
  };

  const playEpisode = (ep: any) => {
    setCurrentEpisode(ep);
    handlePlayClick(ep.videoUrl, `E${ep.episodeNumber || ep.id} • ${ep.title}`);
  };

  const handleStartPlayback = () => {
    if (movie.category === "TV Show") {
      const lastWatchedEpId = watchProgress?.episodeId;
      const savedEp = lastWatchedEpId 
        ? movie.seasons?.[0]?.episodes?.find((e: any) => e.id === lastWatchedEpId || e.episodeNumber === lastWatchedEpId)
        : null;
        
      const epToPlay = savedEp || movie.seasons?.[0]?.episodes?.[0];
      if (epToPlay) {
        playEpisode(epToPlay);
      }
    } else {
      setCurrentEpisode(null);
      handlePlayClick(movie.movieUrl, "Movie");
    }
  };

  const playNextEpisode = () => {
    if (!movie || !currentEpisode) return;
    const currentEpNum = currentEpisode.episodeNumber;
    const nextEp = movie.seasons?.[0]?.episodes?.find((e: any) => e.episodeNumber === currentEpNum + 1);
    if (nextEp) {
      playEpisode(nextEp);
    }
  };

  const handleExitPlayer = () => {
    setIsPlaying(false);
    setVideoUrlToPlay("");
    setCurrentPlayingEpisodeTitle("");
    setCurrentEpisode(null);
  };

  if (isLoading) {
    return <VideoDetailsSkeleton />;
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black text-white w-full flex flex-col items-center justify-center gap-4">
        <span className="text-zinc-550">Asset metadata could not be retrieved.</span>
        <Button onClick={() => navigate(-1)} className="bg-primary text-secondary">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white w-full pb-24 md:pb-0">
      
      {/* Netflix Fullscreen / Aspect box Video container */}
      <div 
        className={isPlaying ? "fixed inset-0 z-[100] bg-black flex items-center justify-center" : "relative w-full aspect-video md:h-[50vh] lg:h-[65vh] bg-black overflow-hidden group select-none border-b border-zinc-900"}
      >
        {isPlaying && videoUrlToPlay ? (
          <CustomVideoPlayer
            movie={movie}
            currentEpisode={currentEpisode}
            videoUrlToPlay={videoUrlToPlay}
            currentPlayingEpisodeTitle={currentPlayingEpisodeTitle}
            onExit={handleExitPlayer}
            playNextEpisode={playNextEpisode}
            userId={userId}
          />
        ) : (
          <>
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-[4]">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#E50914] rounded-full animate-spin" />
              </div>
            )}
            <img 
              src={movie.image} 
              alt={movie.title} 
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
              className={`w-full h-full object-cover animate-in fade-in duration-500 transition-opacity duration-300 ${isImageLoading ? "opacity-0" : "opacity-100"}`} 
            />
            
            {/* Rich theatrical dark gradient fades */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-[2]" />
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-[2]" />

            {/* Desktop Branding & Action overlay (Hidden on Mobile) */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16 z-[3] select-text">
              <div className="hidden md:flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-left-4 duration-500">
                <img src="/assets/logo.png" alt="AVR" className="w-12 h-auto opacity-90" />
                <span className="text-xs  font-semibold  text-primary-foreground">Exclusive</span>
              </div>
              
              <h1 className="hidden md:block text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight drop-shadow-md max-w-2xl text-left animate-in fade-in slide-in-from-left-4 duration-600">
                {movie.title}
              </h1>
              
              <div className="hidden md:flex items-center gap-4 mt-6 animate-in fade-in slide-in-from-left-4 duration-700">
                <Button 
                  onClick={handleStartPlayback}
                  disabled={isSigning}
                  className="bg-white hover:bg-white/95 text-black font-bold px-8 py-6 rounded-md cursor-pointer flex items-center justify-center gap-2 text-base shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-55"
                >
                  {isSigning ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 fill-current text-black" />
                  )}
                  <span>
                    {watchProgress 
                      ? (movie.category === "TV Show" ? `Resume S1·E${watchProgress.episodeId}` : "Resume")
                      : (movie.category === "TV Show" ? "Play S1·E1" : "Play")}
                  </span>
                </Button>

                <Button 
                  onClick={handleToggleMyList}
                  disabled={isListToggling}
                  variant="outline"
                  className="bg-zinc-800/40 hover:bg-zinc-700/60 border-zinc-650 text-white font-bold px-6 py-6 rounded-md cursor-pointer flex items-center justify-center gap-2 text-base transition-transform hover:scale-[1.02] disabled:opacity-55"
                >
                  {isInMyList ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{isInMyList ? "In My List" : "My List"}</span>
                </Button>
              </div>
            </div>

            {/* Play Button Overlay (Mobile Only, hidden on Web) */}
            <div className="md:hidden absolute inset-0 flex items-center justify-center z-[3]">
              <button 
                onClick={handleStartPlayback}
                disabled={isSigning}
                className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors border-2 border-white/20 cursor-pointer disabled:opacity-55 shadow-lg active:scale-95"
              >
                {isSigning ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                )}
              </button>
            </div>
          </>
        )}

        {/* Floating Top Header Navigation */}
        {!isPlaying && (
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6 z-20">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-full bg-black/50 border border-zinc-900 text-white hover:bg-black/85 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full bg-black/50 border border-zinc-900 hover:bg-black/85 hover:border-zinc-700 text-white transition-all cursor-pointer">
                <Cast className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 rounded-full bg-black/50 border border-zinc-900 hover:bg-black/85 hover:border-zinc-700 text-white transition-all cursor-pointer">
                <Share2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Progress helper, only shown when user has saved progress and NOT playing */}
        {!isPlaying && watchProgress && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 pb-3 z-10">
            <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-secondary-foreground rounded-full" 
                style={{ width: `${(watchProgress.currentTime / watchProgress.duration) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {watchProgress.episodeId ? `E${watchProgress.episodeId} • ` : ""}
              {formatProgressTime(watchProgress.currentTime)}
            </span>
          </div>
        )}
      </div>

      {/* Grid Content wrapper */}
      <div className="px-4 md:px-12 lg:px-16 max-w-7xl mx-auto pt-6 space-y-8 pb-16">
        
        {/* Main responsive splits: summary on left, detailed metadata/cast on right */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Left Columns (Span 2): Summaries & Main descriptions */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Mobile Title & Metadata Stack (Hidden on Web) */}
            <div className="md:hidden space-y-3">
              <h1 className="text-2xl font-extrabold text-white text-left">{movie.title}</h1>
              
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400">
                <span className="text-green-500 font-semibold">98% Match</span>
                <span>{movie.year}</span>
                <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-[10px] font-semibold uppercase">{movie.rating}</span>
                <span>{movie.duration}</span>
                <span className="px-1.5 py-0.25 border border-zinc-700 text-zinc-350 rounded text-[9px] font-bold">HDR</span>
              </div>
            </div>

            {/* Mobile action buttons (Hidden on Web) */}
            <div className="md:hidden flex items-center gap-3">
              <Button 
                onClick={handleStartPlayback}
                disabled={isSigning}
                className="flex-1 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-extrabold py-5 rounded-md cursor-pointer disabled:opacity-55"
              >
                {isSigning ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Play className="w-5 h-5 mr-2 fill-white text-white" />
                )}
                {watchProgress 
                  ? (movie.category === "TV Show" ? `Resume S1·E${watchProgress.episodeId}` : "Resume")
                  : (movie.category === "TV Show" ? "Play S1·E1" : "Play")}
              </Button>

              <Button 
                onClick={handleToggleMyList}
                disabled={isListToggling}
                variant="outline" 
                className="flex-1 bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-850 hover:text-white font-extrabold py-5 rounded-md cursor-pointer disabled:opacity-55"
              >
                {isInMyList ? <Check className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {isInMyList ? "In My List" : "My List"}
              </Button>
            </div>

            {/* Web Metadata info inline (Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-3 text-sm font-semibold text-zinc-400">
              <span className="text-green-500 font-extrabold text-base">98% Match</span>
              <span>{movie.year}</span>
              <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-xs font-bold uppercase">{movie.rating}</span>
              <span>{movie.duration}</span>
              <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-[10px] font-bold text-zinc-350">HDR</span>
              <span className="px-1.5 py-0.25 border border-zinc-700 rounded text-[10px] font-bold text-zinc-350">{movie.quality}</span>
            </div>

            {/* Summary description paragraph */}
            <div className="space-y-2 text-left">
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-normal">
                {movie.description}
              </p>
            </div>

          </div>

          {/* Right Column (Span 1): Cast & Genres Lists (Web Only) */}
          <div className="hidden md:flex flex-col gap-4 text-sm text-left border-l border-zinc-900 pl-8">
            <div>
              <span className="text-zinc-500 font-semibold">Cast: </span>
              <span className="text-zinc-300">
                {movie.cast && movie.cast.length > 0 
                  ? movie.cast.map((c: any) => c.name).slice(0, 4).join(', ') 
                  : "N/A"}
              </span>
            </div>
            
            <div>
              <span className="text-zinc-500 font-semibold">Genres: </span>
              <span className="text-zinc-300">
                {movie.category === "TV Show" ? "TV Action & Adventure, Sci-Fi" : "Action & Adventure, Drama"}
              </span>
            </div>

            <div>
              <span className="text-zinc-500 font-semibold">This title is: </span>
              <span className="text-zinc-300">Exciting, Suspenseful, Imaginative</span>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-zinc-900 my-4" />

        {/* Navigation Tabs (Episodes | More Like This | Details) */}
        <div className="space-y-6">
          <div className="flex items-center gap-8 border-b border-zinc-900 pb-3 text-sm md:text-base font-bold text-zinc-400">
            {movie.category === "TV Show" && (
              <button
                onClick={() => setActiveTab('episodes')}
                className={`relative pb-3 -mb-[14px] cursor-pointer transition-colors ${
                  activeTab === 'episodes' ? "text-white border-b-2 border-[#E50914]" : "hover:text-white"
                }`}
              >
                Episodes
              </button>
            )}
            <button
              onClick={() => setActiveTab('related')}
              className={`relative pb-3 -mb-[14px] cursor-pointer transition-colors ${
                activeTab === 'related' ? "text-white border-b-2 border-[#E50914]" : "hover:text-white"
              }`}
            >
              More Like This
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`relative pb-3 -mb-[14px] cursor-pointer transition-colors ${
                activeTab === 'details' ? "text-white border-b-2 border-[#E50914]" : "hover:text-white"
              }`}
            >
              Details
            </button>
          </div>

          {/* Tab Panel contents */}
          <div className="pt-2 animate-in fade-in duration-200">
            
            {/* Episodes Panel */}
            {activeTab === 'episodes' && movie.category === "TV Show" && movie.seasons && movie.seasons.length > 0 && (
              <div className="space-y-6">
                {/* Season select dropdown box */}
                <div className="flex justify-start">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-md hover:text-white transition-all cursor-pointer">
                    <span>{movie.seasons[0].label}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Episodes listing vertically */}
                <div className="space-y-4 max-w-4xl" id="episodes-section">
                  {movie.seasons[0].episodes.map((ep: any, index: number) => (
                    <div
                      key={ep.id}
                      onClick={() => playEpisode(ep)}
                      className="grid grid-cols-12 gap-4 border-b border-zinc-900/60 pb-4 pt-2 hover:bg-zinc-900/40 rounded-lg p-2 transition-all cursor-pointer group"
                    >
                      {/* Left: Thumbnail aspect card */}
                      <div className="col-span-4 md:col-span-3 aspect-video relative rounded-md overflow-hidden bg-zinc-900 shadow-md">
                        <img src={ep.image} alt={ep.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white scale-90 group-hover:scale-100 transition-transform duration-300" />
                        </div>
                        
                        {/* Episode specific progress bar */}
                        {(() => {
                          const epProgress = getEpisodeProgress(ep.id);
                          if (epProgress) {
                            return (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-850">
                                <div 
                                  className="h-full bg-secondary-foreground" 
                                  style={{ width: `${(epProgress.currentTime / epProgress.duration) * 100}%` }}
                                />
                              </div>
                            );
                          }
                          return (
                            <span className="absolute bottom-1 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-350">
                              {ep.duration}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Right: Info and description details */}
                      <div className="col-span-8 md:col-span-9 flex flex-col justify-center text-left gap-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm md:text-base font-bold text-white group-hover:text-primary-foreground transition-colors">
                            {index + 1}. {ep.title}
                          </h4>
                          <span className="hidden md:inline text-xs font-semibold text-zinc-500">{ep.duration}</span>
                        </div>
                        <p className="text-xs md:text-sm text-zinc-400 leading-relaxed line-clamp-2 md:line-clamp-3">
                          {ep.description || "Suspended while pursuing a cold trail, the search uncovers shocking betrayals and triggers a complex race against the clock."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related/More Like This Panel */}
            {activeTab === 'related' && movie.related && movie.related.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                {movie.related.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/video/${item.id}`)}
                    className="relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer group shadow-lg border border-zinc-900"
                  >
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.03] group-hover:brightness-[0.4] transition-all duration-300" />
                    
                    {/* The theatrical hover details overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2.5 md:p-4 text-left z-10 border border-zinc-800/80 rounded-md">
                      
                      {/* Genre/Category Badge */}
                      <div className="flex justify-end mb-1 md:mb-2">
                        <span className="text-[9px] md:text-[10px] font-semibold text-zinc-350 bg-zinc-900/95 border border-zinc-850 px-2 py-0.5 rounded uppercase tracking-wider">
                          {item.category || "Movie"}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm md:text-base font-bold text-white text-right leading-tight mb-1 truncate drop-shadow-md">
                        {item.title}
                      </h4>

                      {/* Metadata Row */}
                      <div className="flex items-center justify-between text-[9px] md:text-[10px] font-semibold text-zinc-400 mb-2 md:mb-3">
                        <span className="truncate">English (UK)</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] md:text-[10px] opacity-85">🌐</span>
                          <span>{item.duration || "N/A"}</span>
                        </div>
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/video/${item.id}`);
                          }}
                          className="flex-1 py-1.5 md:py-2 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-bold text-[10px] md:text-xs rounded transition-all active:scale-[0.98] cursor-pointer text-center shadow"
                        >
                          Play Now
                        </button>
                        <button 
                          onClick={(e) => handleToggleRelatedMyList(e, item)}
                          disabled={isListToggling}
                          className="p-1.5 md:p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded cursor-pointer flex items-center justify-center transition-colors active:scale-95 shadow disabled:opacity-55"
                        >
                          {myListIds.includes(item.id.toString()) ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cast & Metadata Details Panel */}
            {activeTab === 'details' && (
              <div className="space-y-6 text-left">
                {movie.cast && movie.cast.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-zinc-400">Cast Members</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                      {movie.cast.map((person: any, idx: number) => (
                        <div key={idx} className="text-center space-y-2">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mx-auto border-2 border-zinc-800 hover:border-[#E50914] transition-colors shadow-md">
                            <img src={person.image} alt={person.name} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-xs font-semibold text-zinc-300 truncate max-w-[100px] mx-auto">{person.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-550 text-sm">No cast metadata available.</div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-zinc-900 text-xs md:text-sm">
                  <div>
                    <span className="text-zinc-500 block mb-1">Genres</span>
                    <span className="text-zinc-300 font-semibold">{movie.category === "TV Show" ? "TV Action & Adventure, Sci-Fi & Fantasy, Crime Shows" : "Action & Adventure, Crime Thrillers, Dramas"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">Maturity Rating</span>
                    <span className="text-zinc-300 font-semibold px-2 py-0.5 border border-zinc-700 rounded bg-zinc-950 inline-block uppercase mr-2">{movie.rating}</span>
                    <span className="text-zinc-450">Recommended for ages {movie.rating.includes('18') || movie.rating.includes('A') ? '18' : '13'} and up</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default VideoDetails;
