import React from 'react';
import {
  Play, Pause, ChevronLeft, Volume2, VolumeX, Maximize, Minimize,
  Settings, ChevronsLeft, ChevronsRight, Heart, Sun, ListVideo, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedbackModal } from './FeedbackModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useCustomVideoPlayer, getDevSafeUrl } from './useCustomVideoPlayer';

interface CustomVideoPlayerProps {
  movie: any;
  currentEpisode: any;
  videoUrlToPlay: string;
  currentPlayingEpisodeTitle: string;
  onExit: () => void;
  playNextEpisode: () => void;
  userId: string;
  playInline?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  hasAlreadyRated?: boolean;
  onFeedbackSubmitted?: () => void;
  trailerUrl?: string;
}

export interface CustomVideoPlayerRef {
  togglePlayPause: () => void;
}

export const CustomVideoPlayer = React.forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(({
  movie,
  currentEpisode,
  videoUrlToPlay,
  currentPlayingEpisodeTitle,
  onExit,
  playNextEpisode,
  userId,
  playInline = false,
  onPlayStateChange,
  hasAlreadyRated = false,
  onFeedbackSubmitted,
  trailerUrl
}, ref) => {
  const navigate = useNavigate();

  const player = useCustomVideoPlayer({
    movie,
    currentEpisode,
    videoUrlToPlay,
    currentPlayingEpisodeTitle,
    onExit,
    playNextEpisode,
    userId,
    playInline,
    onPlayStateChange,
    hasAlreadyRated,
    onFeedbackSubmitted,
    trailerUrl
  });

  React.useImperativeHandle(ref, () => ({
    togglePlayPause: () => player.togglePlayPause()
  }));

  return (
    <div
      ref={player.containerRef}
      className="w-full h-full relative flex items-center justify-center bg-black select-none"
      onMouseMove={player.triggerControlsShow}
    >
      <div
        className="w-full h-full relative flex items-center justify-center bg-black"
        style={(player.isMobilePortrait && (player.isFullscreen || !playInline)) ? {
          width: '100vh',
          height: '100vw',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)',
          zIndex: 9999
        } : undefined}
      >
        <>
          <video
            ref={player.videoRef}
            tabIndex={-1}
            className="w-full h-full object-contain cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              player.setShowControls((prev) => {
                const nextVal = !prev;
                if (nextVal) {
                  player.triggerControlsShow();
                } else {
                  if (player.videoRef.current) {
                    // Let Hls.js or native player handle auto hide controls if active
                  }
                }
                return nextVal;
              });
            }}
            onTimeUpdate={player.handleTimeUpdate}
            onDurationChange={player.handleDurationChange}
            onEnded={player.handleTimeUpdate} // Calls hook internally via handleEnded context
            onWaiting={() => player.setIsVideoLoading(true)}
            onPlaying={() => player.setIsVideoLoading(false)}
            onSeeking={() => player.setIsVideoLoading(true)}
            onSeeked={() => player.setIsVideoLoading(false)}
            onCanPlay={() => player.setIsVideoLoading(false)}
            onLoadedData={() => player.setIsVideoLoading(false)}
            crossOrigin="anonymous"
            playsInline
          >
            {player.dbCaptions.map((sub: any, idx: number) => {
              const rawSrc = sub.url || sub.caption_file || sub.src;
              const trackSrc = getDevSafeUrl(rawSrc);
              return (
                <track
                  key={`${idx}_${rawSrc}`}
                  src={trackSrc}
                  label={sub.language || sub.label || sub.name}
                  srcLang={sub.languageCode || sub.language?.substring(0, 2).toLowerCase() || sub.lang || "en"}
                  kind="subtitles"
                />
              );
            })}
          </video>

          {/* Custom Subtitles Overlay */}
          {player.activeCueText && (
            <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center w-full max-w-[85%] select-none">
              <span
                className="inline-block bg-black/80 px-4 py-1.5 rounded text-white text-sm sm:text-base md:text-lg lg:text-xl font-semibold tracking-wide shadow-2xl whitespace-pre-line"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
              >
                {player.activeCueText}
              </span>
            </div>
          )}

          {/* Click/Tap cover to show controls when hidden */}
          {!player.showControls && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                player.triggerControlsShow();
              }}
              className="focusable absolute inset-0 z-[9] bg-transparent cursor-pointer"
            />
          )}

          {/* Loading Spinner Overlay */}
          {player.isVideoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30 pointer-events-none">
              <div className="w-12 h-12 border-4 border-zinc-800 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Skip Trailer Button */}
          {player.isPlayingTrailer && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                player.setIsPlayingTrailer(false);
                player.setCurrentSourceUrl(videoUrlToPlay);
              }}
              className="focusable absolute bottom-12 right-6 md:bottom-24 md:right-8 z-30 bg-transparent hover:bg-transparent border-none p-0 text-white font-semibold shadow-none text-sm md:bg-zinc-950/90 md:hover:bg-zinc-950/90 md:border md:border-zinc-700 md:hover:border-zinc-500 md:px-3 md:py-3 md:rounded-lg md:shadow-2xl transition-all active:scale-[0.98] cursor-pointer flex items-center md:gap-2 outline-none"
            >
              <span>Skip</span>
            </Button>
          )}

          {/* Simulated Brightness Overlay */}
          <div
            className="absolute inset-0 bg-black pointer-events-none z-[5]"
            style={{ opacity: ((100 - player.brightness) / 100) * 0.75 }}
          />

          {/* Netflix styled Next Episode countdown popup */}
          {player.nextEpisodeCountdown !== null && (
            <div className="absolute bottom-24 right-6 bg-zinc-950/95 border border-zinc-850 p-4 rounded-lg shadow-2xl flex flex-col gap-3 z-30 max-w-xs animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Next Episode</span>
                  <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">
                    {movie.seasons?.[0]?.episodes?.find((e: any) => e.episodeNumber === currentEpisode?.episodeNumber + 1)?.title || "Upcoming Ep"}
                  </h4>
                </div>
                <button
                  onClick={() => player.setNextEpisodeCountdown(null)}
                  className="focusable focusable text-zinc-500 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <button
                onClick={() => {
                  playNextEpisode();
                  player.setNextEpisodeCountdown(null);
                }}
                className="focusable focusable w-full py-2 bg-white text-black text-xs font-bold rounded hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play Now ({player.nextEpisodeCountdown}s)
              </button>
            </div>
          )}

          {/* Premium Controls Overlay */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              player.setShowControls(false);
            }}
            className={`focusable absolute inset-0 bg-black/40 flex flex-col justify-between transition-opacity duration-300 z-10 ${player.showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {/* Top Controls Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="focusable p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (document.fullscreenElement) {
                      document.exitFullscreen().catch(() => { });
                    }
                    onExit();
                  }}
                  className="focusable focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs md:text-sm truncate max-w-[200px] md:max-w-xs text-left">
                      {movie.title}
                    </span>
                    {player.isPlayingTrailer && (
                      <span className="px-1.5 py-0.5 bg-yellow-500 text-black text-[9px] font-extrabold rounded uppercase tracking-wider shrink-0 select-none">
                        Trailer
                      </span>
                    )}
                  </div>
                  {currentPlayingEpisodeTitle && !player.isPlayingTrailer && (
                    <span className="text-[10px] text-zinc-450 font-medium text-left">
                      {currentPlayingEpisodeTitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0 text-white">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    player.setIsCCOverlayMode(false);
                    player.setShowSettingsOverlay(true);
                    player.setActiveSettingTab('quality');
                  }}
                  className="focusable focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer outline-none border border-transparent focus:border-zinc-700"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={player.toggleFullscreen}
                  className="focusable p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer outline-none border border-transparent focus:border-zinc-700"
                  title="Fullscreen"
                >
                  {player.isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Left vertical edge: Brightness slider */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="focusable flex flex-col items-center gap-2 absolute left-8 top-1/2 -translate-y-1/2 z-20"
            >
              <Sun className="w-5 h-5 text-zinc-350" />
              <div className="h-24 w-6 flex items-center justify-center relative">
                <input
                  tabIndex={-1}
                  type="range"
                  min="10"
                  max="100"
                  value={player.brightness}
                  onChange={(e) => player.setBrightness(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="focusable w-1.5 h-24 bg-zinc-700 rounded-lg cursor-pointer outline-none accent-white"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl'
                  } as any}
                  {...{ orient: "vertical" }}
                />
              </div>
            </div>

            {/* Right vertical edge: Volume slider */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="focusable flex flex-col items-center gap-2 absolute right-8 top-1/2 -translate-y-1/2 z-20"
            >
              <button
                onClick={player.toggleMute}
                className="focusable focusable text-zinc-350 hover:text-white transition-colors cursor-pointer"
              >
                {player.isMuted || player.volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="h-24 w-6 flex items-center justify-center relative">
                <input
                  tabIndex={-1}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={player.isMuted ? 0 : player.volume}
                  onChange={player.handleVolumeChange}
                  onClick={(e) => e.stopPropagation()}
                  className="focusable w-1.5 h-24 bg-zinc-700 rounded-lg cursor-pointer outline-none accent-white"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl'
                  } as any}
                  {...{ orient: "vertical" }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-12 md:gap-20">
              <button
                onClick={player.skipBackward}
                className="focusable p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-center"
                title="Rewind 10s"
              >
                <ChevronsLeft className="w-8 h-8 md:w-10 md:h-10" />
              </button>

              <button
                onClick={player.togglePlayPause}
                className="focusable w-10 md:w-16 h-10 md:h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg cursor-pointer animate-in fade-in"
                title={player.isCurrentlyPlaying ? "Pause" : "Play"}
              >
                {player.isCurrentlyPlaying ? (
                  <Pause className="w-5 md:w-8 h-5 md:h-8 fill-current text-black" />
                ) : (
                  <Play className="w-5 md:w-8 h-5 md:h-8 fill-current text-black ml-1" />
                )}
              </button>

              <button
                onClick={player.skipForward}
                className="focusable p-3 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-white flex items-center justify-center"
                title="Fast Forward 10s"
              >
                <ChevronsRight className="w-8 h-8 md:w-10 md:h-10" />
              </button>
            </div>

            {/* Bottom Controls Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="focusable p-4 bg-gradient-to-t from-black/80 to-transparent space-y-3"
            >
              {/* Progress Bar/Scrubber */}
              <div className="flex items-center gap-3">
                <input
                  tabIndex={-1}
                  type="range"
                  min={0}
                  max={player.duration || 100}
                  step={0.1}
                  value={player.currentTime}
                  onChange={player.handleScrub}
                  className="focusable flex-1 h-1 rounded-lg cursor-pointer outline-none transition-all hover:h-1.5"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(player.currentTime / (player.duration || 100)) * 100}%, #4B5563 ${(player.currentTime / (player.duration || 100)) * 100}%, #4B5563 100%)`,
                    WebkitAppearance: 'none',
                  }}
                />
              </div>

              {/* Control Action Buttons below timeline */}
              <div className="flex items-center justify-between text-xs md:text-sm font-semibold text-zinc-350 px-1 gap-2 overflow-hidden">
                <div className="flex items-center gap-3 sm:gap-6 shrink">
                  {/* Episodes button for shows */}
                  {(movie.category === "TV Show" || movie.category === "Documentary") && movie.seasons && movie.seasons.length > 0 && (
                    <button
                      className="focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
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
                      player.setShowSettingsOverlay(true);
                      player.setActiveSettingTab('speed');
                    }}
                    className="focusable focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                  >
                    <span className="px-1.5 py-0.5 border border-zinc-700 rounded text-[9px] uppercase font-bold text-zinc-400">Speed</span>
                    <span>{player.playbackSpeed === 1 ? "1x" : `${player.playbackSpeed}x`}</span>
                  </button>

                  {/* Rate heart button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      player.setIsRated(!player.isRated);
                    }}
                    className="focusable focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300"
                    title="Rate"
                  >
                    <Heart className={`w-4 h-4 transition-colors ${player.isRated ? "fill-red-500 text-red-500" : ""}`} />
                    <span>Rate</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-6 shrink-0">
                  {/* Next Episode Button */}
                  {(movie.category === "TV Show" || movie.category === "Documentary") && currentEpisode && (
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
                            className="focusable focusable flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer text-zinc-300 animate-pulse"
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
                  <span className="font-mono text-xs text-zinc-400 whitespace-nowrap shrink-0">
                    {player.formatTime(player.currentTime)}/{player.formatTime(player.duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Overlay Drawer */}
          {player.showSettingsOverlay && (
            <>
              {/* Backdrop to close the dropdown when clicking outside */}
              <div
                tabIndex={-1}
                className="focusable absolute inset-0 z-30 cursor-default"
                onClick={(e) => {
                  e.stopPropagation();
                  player.setShowSettingsOverlay(false);
                }}
              />

              <div
                tabIndex={-1}
                className="focusable settings-overlay-panel absolute top-3 right-3 sm:top-16 sm:right-4 w-49 xs:w-80 max-w-[calc(100vw-1.5rem)] sm:max-w-none max-h-[calc(100%-1.5rem)] sm:max-h-[calc(100%-5rem)] bg-zinc-950/95 border border-zinc-800 rounded-xl backdrop-blur-md shadow-2xl flex flex-col p-3 z-40 animate-in fade-in slide-in-from-top-3 duration-200 text-left overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {player.isCCOverlayMode ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900 shrink-0 mb-3">
                      <span className="text-xs font-bold text-white">Subtitles</span>
                    </div>

                    <div className="flex flex-col gap-1 w-full text-zinc-350 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      <button
                        onClick={() => {
                          player.handleSubtitleChange(-1);
                          player.setShowSettingsOverlay(false);
                        }}
                        className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left font-sans text-zinc-300 outline-none"
                      >
                        <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${player.currentSubtitleTrack === -1 ? "opacity-100" : "opacity-0"}`}>✓</span>
                        <span className={player.currentSubtitleTrack === -1 ? "text-white font-bold" : "hover:text-white text-zinc-400"}>
                          Off
                        </span>
                      </button>

                      {player.subtitleTracks.map((track) => {
                        const isActive = player.currentSubtitleTrack === track.id;
                        return (
                          <button
                            key={track.id}
                            onClick={() => {
                              player.handleSubtitleChange(track.id);
                              player.setShowSettingsOverlay(false);
                            }}
                            className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left font-sans text-zinc-300 outline-none"
                          >
                            <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                            <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                              {track.name}
                            </span>
                          </button>
                        );
                      })}

                      {player.subtitleTracks.length === 0 && (
                        <div className="text-zinc-500 text-xs py-4 text-center font-sans">
                          No subtitles available
                        </div>
                      )}
                    </div>
                  </div>
                ) : player.showReportSection ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                      <button
                        onClick={() => player.setShowReportSection(false)}
                        className="focusable focusable p-1 hover:bg-zinc-900 rounded-md text-zinc-400 hover:text-white transition-colors outline-none cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4 text-white" />
                      </button>
                      <span className="text-xs font-bold text-white">Report an Issue</span>
                    </div>

                    <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      {[
                        { key: 'quality_issue', label: 'Quality Issue' },
                        { key: 'audio_issue', label: 'Audio Issue' },
                        { key: 'buffering_connection_issue', label: 'Buffering and Connection Issue' },
                        { key: 'caption_issue', label: 'Caption Issue' }
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => player.handleReportIssue(item.label)}
                          className="focusable focusable text-xs font-semibold cursor-pointer py-2 px-3 rounded hover:bg-white/5 border border-zinc-900 hover:border-zinc-800 text-zinc-300 hover:text-white text-left outline-none transition-all duration-150"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between md:mb-2.5 pb-2 border-b border-zinc-900 shrink-0">
                      <button
                        onClick={() => player.setShowReportSection(true)}
                        className="focusable focusable text-[10px] md:text-xs font-semibold text-zinc-450 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 outline-none"
                      >
                        <AlertCircle className="w-4 h-4 text-primary-foreground" />
                        <span>Report an Issue</span>
                      </button>
                    </div>

                    <Tabs defaultValue="quality" value={player.activeSettingTab} onValueChange={(val) => player.setActiveSettingTab(val as any)} className="w-full flex flex-col flex-1 min-h-0">
                      <TabsList className="grid grid-cols-3 bg-zinc-900 p-0.5 md:mb-2 w-full shrink-0">
                        <TabsTrigger value="quality" className="focusable rounded-md font-semibold text-xs py-1 cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 w-full text-center outline-none">
                          Quality
                        </TabsTrigger>
                        <TabsTrigger value="speed" className="focusable rounded-md font-semibold text-xs py-1 cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 w-full text-center outline-none">
                          Speed
                        </TabsTrigger>
                        <TabsTrigger value="subtitles" className="focusable rounded-md font-semibold text-xs py-1 cursor-pointer data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 w-full text-center outline-none">
                          Subtitles
                        </TabsTrigger>
                      </TabsList>

                      {/* Content Options */}
                      <div className="overflow-y-auto w-full my-0.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent flex-1 min-h-0">
                        <TabsContent value="quality" className="mt-0 outline-none w-full">
                          <div className="flex flex-col md:gap-1 w-full text-zinc-300">
                            {player.qualities.length > 0 ? (
                              player.qualities.map((q) => {
                                const isActive = player.currentQuality === q.id;
                                const effectiveMax = player.isPlayingTrailer ? 2160 : player.maxResolutionHeight;
                                const isLocked = q.id !== -1 && q.height > effectiveMax;
                                const label = q.id === -1 ? "Auto (Recommended)" : q.name;

                                return (
                                  <div
                                    key={`${q.height}_${q.id}`}
                                    className="flex items-center justify-between w-full hover:bg-white/5 rounded px-2 py-1"
                                  >
                                    <button
                                      onClick={() => {
                                        if (isLocked) {
                                          if (document.fullscreenElement) {
                                            document.exitFullscreen().catch(() => { });
                                          }
                                          navigate("/upgrade-plan");
                                        } else {
                                          player.handleQualityChange(q.id);
                                        }
                                        player.setShowSettingsOverlay(false);
                                      }}
                                      className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-0.5 rounded w-full text-left outline-none"
                                    >
                                      <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive && !isLocked ? "opacity-100" : "opacity-0"}`}>✓</span>
                                      <span className={isActive && !isLocked ? "text-white font-bold" : "hover:text-white text-zinc-400"}>
                                        {label}
                                      </span>
                                    </button>

                                    {isLocked && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (document.fullscreenElement) {
                                            document.exitFullscreen().catch(() => { });
                                          }
                                          navigate("/upgrade-plan");
                                          player.setShowSettingsOverlay(false);
                                        }}
                                        className="focusable focusable bg-primary-foreground text-secondary px-2 py-0.5 rounded text-[10px] font-bold ml-2 shrink-0 cursor-pointer hover:bg-primary-foreground/90 transition-all outline-none"
                                      >
                                        Upgrade
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              // Standard quality series for static MP4 / no HLS levels
                              (() => {
                                const staticOpts = [
                                  { id: -1, label: "Auto (Recommended)", height: 0 },
                                  { id: 1080, label: "1080p", height: 1080 },
                                  { id: 720, label: "720p", height: 720 },
                                  { id: 480, label: "480p", height: 480 },
                                  { id: 360, label: "360p", height: 360 },
                                  { id: 240, label: "240p", height: 240 },
                                  { id: 144, label: "144p", height: 144 },
                                ];
                                return staticOpts.map((opt) => {
                                  const isActive = player.currentQuality === opt.id;
                                  const effectiveMax = player.isPlayingTrailer ? 2160 : player.maxResolutionHeight;
                                  const isLocked = opt.id !== -1 && opt.height > effectiveMax;
                                  return (
                                    <div
                                      key={opt.id}
                                      className="flex items-center justify-between w-full hover:bg-white/5 rounded px-2 py-1"
                                    >
                                      <button
                                        onClick={() => {
                                          if (isLocked) {
                                            if (document.fullscreenElement) {
                                              document.exitFullscreen().catch(() => { });
                                            }
                                            navigate("/upgrade-plan");
                                          } else {
                                            player.handleQualityChange(opt.id); // Triggers quality set in hook context
                                          }
                                          player.setShowSettingsOverlay(false);
                                        }}
                                        className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-0.5 rounded w-full text-left outline-none"
                                      >
                                        <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive && !isLocked ? "opacity-100" : "opacity-0"}`}>✓</span>
                                        <span className={isActive && !isLocked ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                                          {opt.label}
                                        </span>
                                      </button>

                                      {isLocked && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (document.fullscreenElement) {
                                              document.exitFullscreen().catch(() => { });
                                            }
                                            navigate("/upgrade-plan");
                                            player.setShowSettingsOverlay(false);
                                          }}
                                          className="focusable focusable bg-primary-foreground text-secondary px-2 py-0.5 rounded text-[10px] font-bold ml-2 shrink-0 cursor-pointer hover:bg-primary-foreground/90 transition-all outline-none"
                                        >
                                          Upgrade
                                        </button>
                                      )}
                                    </div>
                                  );
                                });
                              })()
                            )}
                          </div>
                        </TabsContent>

                        <TabsContent value="speed" className="mt-0 outline-none w-full">
                          <div className="flex flex-col gap-1 w-full text-zinc-350">
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => {
                              const isActive = player.playbackSpeed === sp;
                              return (
                                <button
                                  key={sp}
                                  onClick={() => {
                                    player.handleSpeedChange(sp);
                                    player.setShowSettingsOverlay(false);
                                  }}
                                  className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left outline-none"
                                >
                                  <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                                  <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                                    {sp === 1 ? "1x (Normal)" : `${sp}x`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </TabsContent>

                        <TabsContent value="subtitles" className="mt-0 outline-none w-full">
                          <div className="flex flex-col gap-1 w-full text-zinc-350">
                            <button
                              onClick={() => {
                                player.handleSubtitleChange(-1);
                                player.setShowSettingsOverlay(false);
                              }}
                              className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left font-sans text-zinc-300 outline-none"
                            >
                              <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${player.currentSubtitleTrack === -1 ? "opacity-100" : "opacity-0"}`}>✓</span>
                              <span className={player.currentSubtitleTrack === -1 ? "text-white font-bold" : "hover:text-white text-zinc-400"}>
                                Off
                              </span>
                            </button>

                            {player.subtitleTracks.map((track) => {
                              const isActive = player.currentSubtitleTrack === track.id;
                              return (
                                <button
                                  key={track.id}
                                  onClick={() => {
                                    player.handleSubtitleChange(track.id);
                                    player.setShowSettingsOverlay(false);
                                  }}
                                  className="focusable focusable flex items-center gap-2 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded hover:bg-white/5 w-full text-left font-sans text-zinc-300 outline-none"
                                >
                                  <span className={`text-primary font-bold text-sm w-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>✓</span>
                                  <span className={isActive ? "text-white font-bold" : "hover:text-white text-zinc-450"}>
                                    {track.name}
                                  </span>
                                </button>
                              );
                            })}

                            {player.subtitleTracks.length === 0 && (
                              <div className="text-zinc-500 text-xs py-4 text-center font-sans">
                                No subtitles available
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </>
                )}
              </div>
            </>
          )}

          {/* Feedback / Review Overlay Modal */}
          <FeedbackModal
            isOpen={player.showFeedbackOverlay}
            onClose={() => {
              player.setShowFeedbackOverlay(false);
              onExit();
            }}
            onSubmitSuccess={() => {
              player.setShowFeedbackOverlay(false);
              if (onFeedbackSubmitted) {
                onFeedbackSubmitted();
              }
              onExit();
            }}
            movieId={movie.id}
            movieTitle={movie.title}
            userId={userId}
          />
        </>
      </div>
    </div>
  );
});
