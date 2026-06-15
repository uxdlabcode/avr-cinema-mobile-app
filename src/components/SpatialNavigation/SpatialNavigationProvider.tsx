import React, { createContext, useContext, useEffect, useRef } from "react";
import { isTvPlatform, TV_KEYS } from "@/lib/tvUtils";
import { useNavigate } from "react-router-dom";

interface SpatialNavigationContextType {
  isTV: boolean;
}

const SpatialNavigationContext = createContext<SpatialNavigationContextType>({
  isTV: false,
});

export const useSpatialNavigation = () => useContext(SpatialNavigationContext);

interface SpatialNavigationProviderProps {
  children: React.ReactNode;
}

export const SpatialNavigationProvider: React.FC<SpatialNavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const isTV = isTvPlatform();

  useEffect(() => {
    if (!isTV) return;

    // Apply global tv class to body
    document.body.classList.add("platform-tv");

    // Automatically focus first focusable element if none is focused
    const autoFocusFirst = () => {
      if (!document.activeElement || document.activeElement === document.body) {
        const firstFocusable = document.querySelector(".focusable") as HTMLElement;
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    };

    // Auto-focus on mount or routes change
    setTimeout(autoFocusFirst, 200);

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is currently typing in an input/textarea, let normal keyboard navigation happen
      const activeEl = document.activeElement;
      const isInputActive = 
        activeEl && 
        (activeEl.tagName === "INPUT" || 
         activeEl.tagName === "TEXTAREA" || 
         activeEl.getAttribute("contenteditable") === "true");

      // Handle D-pad directional keys
      if (
        e.key === TV_KEYS.UP ||
        e.key === TV_KEYS.DOWN ||
        e.key === TV_KEYS.LEFT ||
        e.key === TV_KEYS.RIGHT
      ) {
        // Prevent default scrolling behaviour of browser
        e.preventDefault();
        
        moveFocus(e.key);
      } else if (e.key === TV_KEYS.ENTER) {
        // Click the focused element if it is not an input
        if (!isInputActive && activeEl && (activeEl as HTMLElement).click) {
          e.preventDefault();
          (activeEl as HTMLElement).click();
        }
      } else if (e.key === TV_KEYS.BACK || e.key === TV_KEYS.BACKSPACE) {
        // Handle Back Button on TV
        if (!isInputActive) {
          e.preventDefault();
          // Navigate back in history
          window.history.back();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Periodically make sure something is focused (if routes change or panels mount)
    const focusInterval = setInterval(autoFocusFirst, 1000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(focusInterval);
      document.body.classList.remove("platform-tv");
    };
  }, [isTV, navigate]);

  // Geometric focus calculation
  const moveFocus = (direction: string) => {
    const activeEl = document.activeElement as HTMLElement;
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];

    if (focusables.length === 0) return;

    // Filter out hidden elements
    const visibleFocusables = focusables.filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.style.display !== "none" && el.style.visibility !== "hidden";
    });

    if (visibleFocusables.length === 0) return;

    // If active element is not focusable or not set, focus first visible focusable
    if (!activeEl || !visibleFocusables.includes(activeEl)) {
      visibleFocusables[0].focus();
      return;
    }

    const activeRect = activeEl.getBoundingClientRect();
    const activeCenter = {
      x: activeRect.left + activeRect.width / 2,
      y: activeRect.top + activeRect.height / 2,
    };

    let bestCandidate: HTMLElement | null = null;
    let minScore = Infinity;

    visibleFocusables.forEach((candidate) => {
      if (candidate === activeEl) return;

      const candRect = candidate.getBoundingClientRect();
      const candCenter = {
        x: candRect.left + candRect.width / 2,
        y: candRect.top + candRect.height / 2,
      };

      const dx = candCenter.x - activeCenter.x;
      const dy = candCenter.y - activeCenter.y;

      let isAligned = false;
      let score = 0;

      // Distance score weights the primary direction distance and adds secondary direction penalty
      // score = distance_primary + 3 * abs(distance_secondary)
      switch (direction) {
        case TV_KEYS.RIGHT:
          isAligned = dx > 0 && Math.abs(dy) < dx * 1.5;
          score = dx + 3 * Math.abs(dy);
          break;
        case TV_KEYS.LEFT:
          isAligned = dx < 0 && Math.abs(dy) < Math.abs(dx) * 1.5;
          score = Math.abs(dx) + 3 * Math.abs(dy);
          break;
        case TV_KEYS.DOWN:
          isAligned = dy > 0 && Math.abs(dx) < dy * 1.5;
          score = dy + 3 * Math.abs(dx);
          break;
        case TV_KEYS.UP:
          isAligned = dy < 0 && Math.abs(dx) < Math.abs(dy) * 1.5;
          score = Math.abs(dy) + 3 * Math.abs(dx);
          break;
      }

      if (isAligned && score < minScore) {
        minScore = score;
        bestCandidate = candidate;
      }
    });

    if (bestCandidate) {
      const el = bestCandidate as HTMLElement;
      el.focus();
      
      // Ensure the newly focused element is scrolled into view (useful in long layouts/carousels)
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  };

  return (
    <SpatialNavigationContext.Provider value={{ isTV }}>
      {children}
    </SpatialNavigationContext.Provider>
  );
};

// Focusable Component Wrapper
interface FocusableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onEnter?: () => void;
  disabled?: boolean;
}

export const Focusable = React.forwardRef<HTMLDivElement, FocusableProps>(({
  children,
  className = "",
  onEnter,
  disabled = false,
  ...props
}, ref) => {
  const { isTV } = useSpatialNavigation();

  if (disabled) {
    return <div className={className} {...props}>{children}</div>;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      e.stopPropagation();
      onEnter();
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  // On TV, make sure it has tabIndex={0} and the focusable class
  return (
    <div
      ref={ref}
      tabIndex={isTV ? 0 : undefined}
      className={`${isTV ? "focusable outline-none" : ""} ${className}`}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
});

Focusable.displayName = "Focusable";
