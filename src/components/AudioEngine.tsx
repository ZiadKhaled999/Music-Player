import React, { useEffect, useRef } from 'react';
import { SongItem } from '../types';

interface AudioEngineProps {
  currentSong: SongItem | null;
  isPlaying: boolean;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  seekToTime: number | null;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onError?: (err: any) => void;
}

export const AudioEngine: React.FC<AudioEngineProps> = ({
  currentSong,
  isPlaying,
  playbackSpeed,
  volume,
  isMuted,
  seekToTime,
  onTimeUpdate,
  onEnded,
  onError,
}) => {
  const ytPlayerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerId = 'yt-audio-engine-core';

  // Load YouTube Iframe API once
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // When song changes
  useEffect(() => {
    if (!currentSong) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.stopVideo();
        } catch {
          // ignore
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      return;
    }

    // LOCAL TRACK PLAYBACK
    if (currentSong.isLocal && currentSong.localBlobUrl) {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {
          // ignore
        }
      }
      if (audioRef.current) {
        audioRef.current.src = currentSong.localBlobUrl;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.volume = isMuted ? 0 : volume;
        if (isPlaying) {
          audioRef.current.play().catch((err) => console.warn('Local play error:', err));
        }
      }
      return;
    }

    // YOUTUBE TRACK PLAYBACK
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const initOrLoad = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initOrLoad, 100);
        return;
      }

      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          ytPlayerRef.current.loadVideoById(currentSong.id);
          ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
          ytPlayerRef.current.setPlaybackRate(playbackSpeed);
          if (isPlaying) {
            ytPlayerRef.current.playVideo();
          }
          return;
        } catch (e) {
          console.warn('Re-instantiating YT Player:', e);
        }
      }

      try {
        ytPlayerRef.current = new (window as any).YT.Player(containerId, {
          height: '1',
          width: '1',
          videoId: currentSong.id,
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            ...(window.location.protocol.startsWith('http')
              ? { origin: window.location.origin }
              : {}),
          },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(isMuted ? 0 : volume * 100);
              event.target.setPlaybackRate(playbackSpeed);
              if (isPlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 0) {
                onEnded();
              }
            },
            onError: (err: any) => {
              console.error('YT Player error:', err);
              onError?.(err);
            },
          },
        });
      } catch (err) {
        console.error('Failed to init YT player:', err);
      }
    };

    initOrLoad();
  }, [currentSong?.id, currentSong?.localBlobUrl, currentSong?.isLocal]);

  // Play / Pause handling
  useEffect(() => {
    if (!currentSong) return;

    if (currentSong.isLocal && audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
      return;
    }

    if (!currentSong.isLocal && ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.playVideo();
        } else {
          ytPlayerRef.current.pauseVideo();
        }
      } catch {
        // ignore
      }
    }
  }, [isPlaying, currentSong]);

  // Seek handling
  useEffect(() => {
    if (seekToTime === null || seekToTime === undefined) return;

    if (currentSong?.isLocal && audioRef.current) {
      audioRef.current.currentTime = seekToTime;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(seekToTime, true);
        if (isPlaying) {
          ytPlayerRef.current.playVideo();
        }
      } catch (e) {
        console.warn('Seek error:', e);
      }
    }
  }, [seekToTime]);

  // Volume & Speed
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : volume;

    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, effectiveVol));
      audioRef.current.playbackRate = playbackSpeed;
    }

    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(effectiveVol * 100);
        ytPlayerRef.current.setPlaybackRate(playbackSpeed);
      } catch {
        // ignore
      }
    }
  }, [volume, isMuted, playbackSpeed]);

  // Continuous playback time synchronization for YT
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && !currentSong?.isLocal) {
      timer = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || (currentSong?.durationSeconds || 0);
            onTimeUpdate(cur, dur);
          } catch {
            // ignore
          }
        }
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentSong, onTimeUpdate]);

  return (
    <div className="absolute -top-[9999px] left-0 pointer-events-none opacity-0 overflow-hidden w-1 h-1">
      <div id={containerId} />
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            onTimeUpdate(audioRef.current.currentTime, audioRef.current.duration || 0);
          }
        }}
        onEnded={onEnded}
      />
    </div>
  );
};
