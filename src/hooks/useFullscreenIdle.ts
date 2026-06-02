import { useState, useEffect, useRef, useCallback } from 'react';

export function useFullscreenIdle(
  containerRef: React.RefObject<HTMLElement | null>,
  timeoutMs: number = 3000,
  isPlaying: boolean = false
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, timeoutMs);
    }
  }, [isPlaying, timeoutMs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleInteract = () => resetTimer();
    
    // Automatically hide controls when mouse leaves the player area in windowed mode
    const handleMouseLeave = () => {
      if (isPlaying && !isFullscreen) {
        setIsIdle(true);
      }
    };

    container.addEventListener('mousemove', handleInteract);
    container.addEventListener('touchstart', handleInteract, { passive: true });
    container.addEventListener('click', handleInteract);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Setup initial timer
    resetTimer();

    return () => {
      container.removeEventListener('mousemove', handleInteract);
      container.removeEventListener('touchstart', handleInteract);
      container.removeEventListener('click', handleInteract);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [containerRef, resetTimer, isPlaying, isFullscreen]);

  return {
    isFullscreen,
    isIdle,
    controlsVisible: !isPlaying || !isIdle,
  };
}
