import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, ChevronLeft, Cast, Volume2, VolumeX, Maximize, Minimize,
  Settings, ChevronsLeft, ChevronsRight, Heart, Sun, X, Check,
  WifiOff, MessageSquare, ListVideo
} from 'lucide-react';
import { createDocument, deleteDocument, getDocumentData } from '@/Firebase';

interface CustomVideoPlayerProps {
  movie: any;
  currentEpisode: any;
  videoUrlToPlay: string;
  currentPlayingEpisodeTitle: string;
  onExit: () => void;
  playNextEpisode: () => void;
  userId: string;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  movie,
  currentEpisode,
  videoUrlToPlay,
  currentPlayingEpisodeTitle,
  onExit,
  playNextEpisode,
  userId
}) => {
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [qualities, setQualities] = useState<{ id: number; name: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  
  // Custom Settings overlay states
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState<'quality' | 'audio' | 'speed'>('quality');
  const [brightness, setBrightness] = useState<number>(100);
  const [audioLanguage, setAudioLanguage] = useState<string>("English [Original]");
  const [subtitleLanguage, setSubtitleLanguage] = useState<string>("Off");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isRated, setIsRated] = useState<boolean>(false);
  const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(false);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);

  // Next Episode Countdown states
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  const saveCurrentProgress = async (time: number) => {
    if (!movie) return;
    const currentDur = videoRef.current?.duration || duration;
    if (!currentDur) return;

    const progressKey = currentEpisode ? `${movie.id}_ep_${currentEpisode.id}` : movie.id;
    const isCompleted = (time / currentDur) > 0.95;

    if (userId) {
      try {
        const docId = `${userId}_${progressKey}`;
        if (isCompleted) {
          await deleteDocument("watch_progress", docId);
          if (currentEpisode) {
            await deleteDocument("watch_progress", `${userId}_${movie.id}`);
          }
        } else {
          const payload: any = {
            userId,
            movieId: movie.id,
            currentTime: time,
            duration: currentDur,
            updatedAt: Date.now()
          };
          if (currentEpisode) {
            payload.episodeId = currentEpisode.id;
          }
          await createDocument("watch_progress", docId, payload);

          if (currentEpisode) {
            // Also update the main summary pointer for the TV show
            await createDocument("watch_progress", `${userId}_${movie.id}`, payload);
          }
        }
      } catch (err) {
        console.error("Error updating watch progress in DB:", err);
      }
    } else {
      // LocalStorage fallback
      try {
        const progressDataStr = localStorage.getItem('avr_watch_progress') || '{}';
        const progressData = JSON.parse(progressDataStr);
        
        if (isCompleted) {
          delete progressData[progressKey];
          if (currentEpisode) {
            const mainProgress = progressData[movie.id];
            if (mainProgress && mainProgress.episodeId === currentEpisode.id) {
              delete progressData[movie.id];
            }
          }
        } else {
          progressData[progressKey] = {
            currentTime: time,
            duration: currentDur,
            updatedAt: Date.now()
          };
          
          if (currentEpisode) {
            progressData[movie.id] = {
              currentTime: time,
              duration: currentDur,
              episodeId: currentEpisode.id,
              updatedAt: Date.now()
            };
          }
        }
        
        localStorage.setItem('avr_watch_progress', JSON.stringify(progressData));
      } catch (err) {
        console.error("Error saving progress to localStorage:", err);
      }
    }
  };

  // Save progress on unmount or when changing episode
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        saveCurrentProgress(videoRef.current.currentTime);
      }
    };
  }, [movie, currentEpisode]);

  // Sync fullscreen state from native listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      
      // When entering fullscreen, try locking to landscape again to assist the browser orientation manager
      if (inFullscreen) {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle mobile landscape orientation lock & rotation fallback
  useEffect(() => {
    const handleOrientationCheck = () => {
      const isMobile = window.matchMedia("(max-width: 1023px)").matches;
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setIsMobilePortrait(isMobile && isPortrait);
    };

    // Initial check
    handleOrientationCheck();

    window.addEventListener("resize", handleOrientationCheck);
    window.addEventListener("orientationchange", handleOrientationCheck);

    // Attempt native screen orientation lock
    const lockScreen = async () => {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (err) {
        console.log("Native screen orientation lock failed or unsupported:", err);
      }
    };
    lockScreen();

    return () => {
      window.removeEventListener("resize", handleOrientationCheck);
      window.removeEventListener("orientationchange", handleOrientationCheck);
      
      try {
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (err) {
        console.log("Native screen orientation unlock failed:", err);
      }
    };
  }, []);

  // Next Episode Countdown effect
  useEffect(() => {
    if (nextEpisodeCountdown === null) return;
    if (nextEpisodeCountdown === 0) {
      playNextEpisode();
      setNextEpisodeCountdown(null);
      return;
    }

    countdownIntervalRef.current = setTimeout(() => {
      setNextEpisodeCountdown(nextEpisodeCountdown - 1);
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearTimeout(countdownIntervalRef.current);
      }
    };
  }, [nextEpisodeCountdown]);

  // Load HLS.js script dynamically and bind to the video element
  useEffect(() => {
    if (!videoUrlToPlay || !videoRef.current) return;
    setIsVideoLoading(true);
    const video = videoRef.current;
    let hlsInstance: any = null;

    const initPlayer = async () => {
      let startFromTime = 0;
      
      if (userId) {
        try {
          const progressKey = currentEpisode ? `${movie.id}_ep_${currentEpisode.id}` : movie.id;
          const savedDoc = await getDocumentData("watch_progress", `${userId}_${progressKey}`);
          if (savedDoc && savedDoc.currentTime > 0) {
            startFromTime = savedDoc.currentTime;
          }
        } catch (err) {
          console.error("Error reading saved progress from DB:", err);
        }
      } else {
        try {
          const progressDataStr = localStorage.getItem('avr_watch_progress');
          if (progressDataStr) {
            const progressData = JSON.parse(progressDataStr);
            const progressKey = currentEpisode ? `${movie.id}_ep_${currentEpisode.id}` : movie.id;
            const saved = progressData[progressKey];
            if (saved && saved.currentTime > 0) {
              startFromTime = saved.currentTime;
            }
          }
        } catch (err) {
          console.error("Error reading saved progress:", err);
        }
      }

      const HlsClass = (window as any).Hls;
      if (videoUrlToPlay.includes(".m3u8") && HlsClass && HlsClass.isSupported()) {
        hlsInstance = new HlsClass();
        hlsInstance.loadSource(videoUrlToPlay);
        hlsInstance.attachMedia(video);
        hlsRef.current = hlsInstance;

        hlsInstance.on(HlsClass.Events.MANIFEST_PARSED, () => {
          const levels = hlsInstance.levels.map((level: any, idx: number) => {
            const height = level.height;
            let name = `${height}p`;
            if (height === 1080) name = "1080p";
            else if (height === 720) name = "720p";
            else if (height === 480) name = "480p";
            else if (height === 360) name = "360p";
            return {
              id: idx,
              name: name
            };
          });

          const uniqueLevels = Array.from(new Map(levels.map((item: any) => [item.name, item])).values()) as any[];
          uniqueLevels.sort((a, b) => parseInt(b.name) - parseInt(a.name));
          setQualities([{ id: -1, name: "Auto" }, ...uniqueLevels]);
          setCurrentQuality(hlsInstance.currentLevel);

          // Apply current playback speed
          video.playbackRate = playbackSpeed;

          if (startFromTime > 0) {
            video.currentTime = startFromTime;
            lastSavedTimeRef.current = startFromTime;
          }

          video.play()
            .then(() => setIsCurrentlyPlaying(true))
            .catch(e => console.log("Play error:", e));
        });
      } else {
        video.src = videoUrlToPlay;
        video.playbackRate = playbackSpeed;

        const onCanPlay = () => {
          if (startFromTime > 0) {
            video.currentTime = startFromTime;
            lastSavedTimeRef.current = startFromTime;
          }
          video.removeEventListener("canplay", onCanPlay);
        };
        video.addEventListener("canplay", onCanPlay);

        video.play()
          .then(() => setIsCurrentlyPlaying(true))
          .catch(e => console.log("Play error:", e));
      }
    };

    if (videoUrlToPlay.includes(".m3u8") && !(window as any).Hls) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";
      script.async = true;
      script.onload = initPlayer;
      document.body.appendChild(script);
      return () => {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsRef.current = null;
        }
        try {
          document.body.removeChild(script);
        } catch (_) {}
      };
    } else {
      initPlayer();
      return () => {
        if (hlsInstance) {
          hlsInstance.destroy();
          hlsRef.current = null;
        }
      };
    }
  }, [videoUrlToPlay]);

  // Handle controls auto-hide
  const triggerControlsShow = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!showSettingsOverlay) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isCurrentlyPlaying && !showSettingsOverlay) {
          setShowControls(false);
        }
      }, 3500);
    }
  };

  useEffect(() => {
    if (showSettingsOverlay) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      triggerControlsShow();
    }
  }, [showSettingsOverlay]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlayPause = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isCurrentlyPlaying) {
        videoRef.current.pause();
        setIsCurrentlyPlaying(false);
        saveCurrentProgress(videoRef.current.currentTime);
      } else {
        videoRef.current.play()
          .then(() => setIsCurrentlyPlaying(true))
          .catch(e => console.log("Play failed:", e));
      }
    }
    triggerControlsShow();
  };

  const skipForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
    triggerControlsShow();
  };

  const skipBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
    triggerControlsShow();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Save progress to localStorage every 5 seconds
      if (Math.abs(time - lastSavedTimeRef.current) >= 5) {
        saveCurrentProgress(time);
        lastSavedTimeRef.current = time;
      }
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    triggerControlsShow();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
    triggerControlsShow();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
    triggerControlsShow();
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.log("Request fullscreen error:", err));
      } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.log("Exit fullscreen error:", err));
      }
    }
    triggerControlsShow();
  };

  const handleQualityChange = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId);
    }
  };

  const handleSpeedChange = (speedVal: number) => {
    setPlaybackSpeed(speedVal);
    if (videoRef.current) {
      videoRef.current.playbackRate = speedVal;
    }
  };

  const handleEnded = () => {
    // Check if it's a show and there is a next episode
    if (movie.category === "TV Show" && currentEpisode) {
      const currentEpNum = currentEpisode.episodeNumber;
      const nextEp = movie.seasons?.[0]?.episodes?.find((e: any) => e.episodeNumber === currentEpNum + 1);
      if (nextEp) {
        setNextEpisodeCountdown(5);
        return;
      }
    }
    onExit();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center bg-black select-none"
      onMouseMove={triggerControlsShow}
      onTouchStart={triggerControlsShow}
    >
      <div
        className="w-full h-full relative flex items-center justify-center bg-black"
        style={isMobilePortrait ? {
          width: '100vh',
          height: '100vw',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          zIndex: 9999
        } : undefined}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlayPause}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onEnded={handleEnded}
          onWaiting={() => setIsVideoLoading(true)}
          onPlaying={() => setIsVideoLoading(false)}
          onSeeking={() => setIsVideoLoading(true)}
          onSeeked={() => setIsVideoLoading(false)}
          onCanPlay={() => setIsVideoLoading(false)}
          onLoadedData={() => setIsVideoLoading(false)}
          playsInline
        />

        {/* Loading Spinner Overlay */}
        {isVideoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 pointer-events-none">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        )}

      {/* Simulated Brightness Overlay */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none z-[5]" 
        style={{ opacity: ((100 - brightness) / 100) * 0.75 }}
      />
      
      {/* Netflix styled Next Episode countdown popup */}
      {nextEpisodeCountdown !== null && (
        <div className="absolute bottom-24 right-6 bg-zinc-950/95 border border-zinc-850 p-4 rounded-lg shadow-2xl flex flex-col gap-3 z-30 max-w-xs animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Next Episode</span>
              <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">
                {movie.seasons?.[0]?.episodes?.find((e: any) => e.episodeNumber === currentEpisode?.episodeNumber + 1)?.title || "Upcoming Ep"}
              </h4>
            </div>
            <button 
              onClick={() => setNextEpisodeCountdown(null)}
              className="text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <button 
            onClick={() => {
              playNextEpisode();
              setNextEpisodeCountdown(null);
            }}
            className="w-full py-2 bg-white text-black text-xs font-bold rounded hover:bg-[#E50914] hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Play Now ({nextEpisodeCountdown}s)
          </button>
        </div>
      )}

      {/* Premium Controls Overlay */}
      <div className={`absolute inset-0 bg-black/40 flex flex-col justify-between transition-opacity duration-300 z-10 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        
        {/* Top Controls Bar */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  saveCurrentProgress(videoRef.current.currentTime);
                }
                onExit();
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col text-left">
              <span className="font-bold text-white text-xs md:text-sm truncate max-w-[200px] md:max-w-xs text-left">
                {movie.title}
              </span>
              {currentPlayingEpisodeTitle && (
                <span className="text-[10px] text-zinc-450 font-medium text-left">
                  {currentPlayingEpisodeTitle}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-white">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" title="Cast">
              <Cast className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsOverlay(true);
                setActiveSettingTab('audio');
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" 
              title="Audio & Subtitles"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsOverlay(true);
                setActiveSettingTab('quality');
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" 
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" 
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Left vertical edge: Brightness slider */}
        <div className="flex flex-col items-center gap-2 absolute left-8 top-1/2 -translate-y-1/2 z-20">
          <Sun className="w-5 h-5 text-zinc-350" />
          <div className="h-24 w-6 flex items-center justify-center relative">
            <input
              type="range"
              min="10"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-1.5 h-24 bg-zinc-700 rounded-lg cursor-pointer outline-none accent-white"
              style={{ WebkitAppearance: 'slider-vertical' } as any}
              {...{ orient: "vertical" }}
            />
          </div>
        </div>

        {/* Right vertical edge: Volume slider */}
        <div className="flex flex-col items-center gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-20">
          <button 
            onClick={toggleMute} 
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (videoRef.current) {
                const newMuted = !isMuted;
                videoRef.current.muted = newMuted;
                setIsMuted(newMuted);
              }
              triggerControlsShow();
            }}
            className="text-zinc-350 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="h-24 w-6 flex items-center justify-center relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-1.5 h-24 bg-zinc-700 rounded-lg cursor-pointer outline-none accent-white"
              style={{ WebkitAppearance: 'slider-vertical' } as any}
              {...{ orient: "vertical" }}
            />
          </div>
        </div>

        {/* Middle Play/Pause/Skip Overlay Controls */}
        <div className="flex items-center justify-center gap-12 md:gap-20">
          <button 
            onClick={skipBackward}
            className="p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-center"
            title="Rewind 10s"
          >
            <ChevronsLeft className="w-8 h-8 md:w-10 md:h-10" />
          </button>
          
          <button 
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg cursor-pointer animate-in fade-in"
            title={isCurrentlyPlaying ? "Pause" : "Play"}
          >
            {isCurrentlyPlaying ? (
              <Pause className="w-8 h-8 fill-current text-black" />
            ) : (
              <Play className="w-8 h-8 fill-current text-black ml-1" />
            )}
          </button>

          <button 
            onClick={skipForward}
            className="p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-center"
            title="Fast Forward 10s"
          >
            <ChevronsRight className="w-8 h-8 md:w-10 md:h-10" />
          </button>
        </div>

        {/* Bottom Controls Bar */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent space-y-3">
          {/* Progress Bar/Scrubber */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleScrub}
              className="flex-1 h-1 rounded-lg cursor-pointer outline-none transition-all hover:h-1.5"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(currentTime / (duration || 100)) * 100}%, #4B5563 ${(currentTime / (duration || 100)) * 100}%, #4B5563 100%)`,
                WebkitAppearance: 'none',
              }}
            />
          </div>

          {/* Control Action Buttons below timeline */}
          <div className="flex items-center justify-between text-xs md:text-sm font-semibold text-zinc-350 px-1">
            <div className="flex items-center gap-6">
              {/* Episodes button for shows */}
              {movie.category === "TV Show" && (
                <button 
                  className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = document.getElementById("episodes-section");
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ListVideo className="w-4 h-4" />
                  <span>Episodes</span>
                </button>
              )}
              
              {/* Speed setting indicator */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsOverlay(true);
                  setActiveSettingTab('speed');
                }}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
              >
                <span className="px-1.5 py-0.5 border border-zinc-700 rounded text-[9px] uppercase font-bold text-zinc-400">Speed</span>
                <span>{playbackSpeed === 1 ? "1x" : `${playbackSpeed}x`}</span>
              </button>

              {/* Rate heart button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRated(!isRated);
                }}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                title="Rate"
              >
                <Heart className={`w-4 h-4 transition-colors ${isRated ? "fill-red-500 text-red-500" : ""}`} />
                <span>Rate</span>
              </button>
            </div>

            <div className="flex items-center gap-6">
              {/* Next Episode Button */}
              {movie.category === "TV Show" && currentEpisode && (
                (() => {
                  const currentEpNum = currentEpisode.episodeNumber;
                  const hasNext = movie.seasons?.[0]?.episodes?.some((e: any) => e.episodeNumber === currentEpNum + 1);
                  if (hasNext) {
                    return (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          playNextEpisode();
                        }}
                        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300 animate-pulse"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Next Episode</span>
                      </button>
                    );
                  }
                  return null;
                })()
              )}
              
              {/* Duration tracking */}
              <span className="font-mono text-xs text-zinc-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Settings Overlay Drawer */}
      {showSettingsOverlay && (
        <>
          {/* Backdrop to close the dropdown when clicking outside */}
          <div 
            className="absolute inset-0 z-30 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setShowSettingsOverlay(false);
            }}
          />
          
          <div 
            className="absolute top-16 right-4 w-80 max-w-[calc(100vw-2rem)] bg-zinc-950/95 border border-zinc-800 rounded-xl backdrop-blur-md shadow-2xl flex flex-col p-4 z-40 animate-in fade-in slide-in-from-top-3 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tabs header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3 text-xs font-semibold w-full">
              <button
                onClick={() => setActiveSettingTab('quality')}
                className={`pb-2 -mb-[9px] transition-colors cursor-pointer ${
                  activeSettingTab === 'quality' 
                    ? "text-white border-b-2 border-blue-500 font-bold" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Quality
              </button>
              <button
                onClick={() => setActiveSettingTab('audio')}
                className={`pb-2 -mb-[9px] transition-colors cursor-pointer ${
                  activeSettingTab === 'audio' 
                    ? "text-white border-b-2 border-blue-500 font-bold" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Audio & Subs
              </button>
              <button
                onClick={() => setActiveSettingTab('speed')}
                className={`pb-2 -mb-[9px] transition-colors cursor-pointer ${
                  activeSettingTab === 'speed' 
                    ? "text-white border-b-2 border-blue-500 font-bold" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Speed
              </button>
            </div>

            {/* Content Options */}
            <div className="max-h-60 overflow-y-auto w-full my-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {activeSettingTab === 'quality' && (
                <div className="flex flex-col gap-1 w-full text-zinc-300">
                  {qualities.length > 0 ? (
                    qualities.map((q) => {
                      const isActive = currentQuality === q.id;
                      let label = q.name;
                      if (q.id === -1) label = "Auto (Recommended)";
                      else if (q.name === "1080p") label = "Full HD (1080p)";
                      else if (q.name === "720p") label = "HD (720p)";
                      else if (q.name === "480p") label = "Data Saver (480p)";
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            handleQualityChange(q.id);
                            setShowSettingsOverlay(false);
                          }}
                          className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left"
                        >
                          <span className={`text-blue-500 font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                          <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>{label}</span>
                        </button>
                      );
                    })
                  ) : (
                    // Simulated Quality Options for static MP4
                    [
                      { id: -1, label: "Auto (Recommended)" },
                      { id: 1080, label: "Full HD (1080p)" },
                      { id: 720, label: "HD (720p)" },
                      { id: 480, label: "Data Saver (480p)" }
                    ].map((opt) => {
                      const isActive = currentQuality === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setCurrentQuality(opt.id);
                            setShowSettingsOverlay(false);
                          }}
                          className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left"
                        >
                          <span className={`text-blue-500 font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                          <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>{opt.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {activeSettingTab === 'audio' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs w-full">
                  {/* Audio Column */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1 px-2">Audio</h4>
                    {["English [Original]", "Spanish", "French", "German"].map((lang) => {
                      const isActive = audioLanguage === lang;
                      return (
                        <button
                          key={lang}
                          onClick={() => setAudioLanguage(lang)}
                          className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer py-1 px-2 rounded hover:bg-white/5 w-full text-left"
                        >
                          <span className={`text-blue-500 font-bold text-sm w-3.5 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                          <span className={`${isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"} truncate`} title={lang}>
                            {lang.replace(" [Original]", "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Subtitles Column */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] uppercase tracking-wider font-bold text-zinc-550 mb-1 px-2">Subtitles</h4>
                    {["Off", "English", "Spanish", "French", "German"].map((sub) => {
                      const isActive = subtitleLanguage === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setSubtitleLanguage(sub)}
                          className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer py-1 px-2 rounded hover:bg-white/5 w-full text-left"
                        >
                          <span className={`text-blue-500 font-bold text-sm w-3.5 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                          <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSettingTab === 'speed' && (
                <div className="flex flex-col gap-1 w-full text-zinc-350">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => {
                    const isActive = playbackSpeed === sp;
                    return (
                      <button
                        key={sp}
                        onClick={() => {
                          handleSpeedChange(sp);
                          setShowSettingsOverlay(false);
                        }}
                        className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left"
                      >
                        <span className={`text-blue-500 font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                        <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                          {sp === 1 ? "1x (Normal)" : `${sp}x`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer bar */}
            <div className="flex items-center justify-between w-full text-[10px] text-zinc-500 border-t border-zinc-900 pt-2 mt-2">
              <div>
                {!isOnline && (
                  <span className="flex items-center gap-1 text-red-400">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowSettingsOverlay(false)} 
                  className="p-1 rounded-full bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};
