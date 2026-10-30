import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Headphones, X } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';

interface FloatingSupportButtonProps {
  telegramUrl?: string;
}

const STORAGE_KEY = 'fastkeno_support_button_pos';
const BUTTON_SIZE = 44;
const PADDING = 12;

export const FloatingSupportButton: React.FC<FloatingSupportButtonProps> = ({
  telegramUrl = 'https://t.me/Fastkenosupportteam',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position on screen: x (left), y (top)
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') {
      return { x: 300, y: 500 };
    }
    const defaultX = Math.max(PADDING, window.innerWidth - BUTTON_SIZE - PADDING - 4);
    const defaultY = Math.max(PADDING, window.innerHeight - BUTTON_SIZE - PADDING - 24);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          // Clamp to current viewport
          const maxX = Math.max(PADDING, window.innerWidth - BUTTON_SIZE - PADDING);
          const maxY = Math.max(PADDING, window.innerHeight - BUTTON_SIZE - PADDING);
          return {
            x: Math.min(Math.max(PADDING, parsed.x), maxX),
            y: Math.min(Math.max(PADDING, parsed.y), maxY),
          };
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
    return { x: defaultX, y: defaultY };
  });

  const clampPos = useCallback((x: number, y: number) => {
    const maxX = Math.max(PADDING, window.innerWidth - BUTTON_SIZE - PADDING);
    const maxY = Math.max(PADDING, window.innerHeight - BUTTON_SIZE - PADDING);
    return {
      x: Math.min(Math.max(PADDING, x), maxX),
      y: Math.min(Math.max(PADDING, y), maxY),
    };
  }, []);

  // Clamp on window resize
  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => clampPos(prev.x, prev.y));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPos]);

  // Close when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [isOpen]);

      // Drag handling refs
      const dragInfoRef = useRef<{
        startX: number;
        startY: number;
        btnX: number;
        btnY: number;
        hasMoved: boolean;
      }>({
        startX: 0,
        startY: 0,
        btnX: 0,
        btnY: 0,
        hasMoved: false,
      });

      const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        // Only respond to primary mouse click or touch
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        dragInfoRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          btnX: pos.x,
          btnY: pos.y,
          hasMoved: false,
        };

        setIsDragging(true);

      const onPointerMove = (moveEvt: PointerEvent) => {
        const dx = moveEvt.clientX - dragInfoRef.current.startX;
        const dy = moveEvt.clientY - dragInfoRef.current.startY;

            if (!dragInfoRef.current.hasMoved && Math.hypot(dx, dy) > 6) {
              dragInfoRef.current.hasMoved = true;
            }

            if (dragInfoRef.current.hasMoved) {
              const nextX = dragInfoRef.current.btnX + dx;
              const nextY = dragInfoRef.current.btnY + dy;
              const clamped = clampPos(nextX, nextY);
              setPos(clamped);
            }
          };

            const onPointerUp = (upEvt: PointerEvent) => {
              window.removeEventListener('pointermove', onPointerMove);
              window.removeEventListener('pointerup', onPointerUp);
              window.removeEventListener('pointercancel', onPointerUp);
              setIsDragging(false);

                if (dragInfoRef.current.hasMoved) {
                  const dx = upEvt.clientX - dragInfoRef.current.startX;
                  const dy = upEvt.clientY - dragInfoRef.current.startY;
                  const finalPos = clampPos(dragInfoRef.current.btnX + dx, dragInfoRef.current.btnY + dy);
                  setPos(finalPos);
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
                  } catch {
                    // ignore localStorage errors
                  }
                } else {
                  // Simple tap / click without drag: toggle popover
                  setIsOpen((prev) => !prev);
                }
            };

            window.addEventListener('pointermove', onPointerMove, { passive: true });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
          };

  const handleTelegramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Determine popup positioning based on button's current screen position
  const isNearBottom = pos.y > (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400);
  const isNearRight = pos.x > (typeof window !== 'undefined' ? window.innerWidth * 0.5 : 200);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        userSelect: 'none',
        touchAction: 'none', // Prevents screen scrolling while dragging the button
        display: 'flex',
        flexDirection: 'column',
        alignItems: isNearRight ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Floating Telegram Action Pill */}
      <div
        onClick={handleTelegramClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleTelegramClick(e as any);
          }
        }}
        title="Open Telegram Support @Fastkenosupportteam"
        style={{
          position: 'absolute',
          [isNearBottom ? 'bottom' : 'top']: BUTTON_SIZE + 10,
          [isNearRight ? 'right' : 'left']: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #24A1DE 0%, #1A8CC2 100%)',
          borderRadius: 9999,
          padding: '6px 14px 6px 7px',
          boxShadow: '0 6px 18px rgba(36, 161, 222, 0.45), 0 2px 8px rgba(0, 0, 0, 0.5)',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen
            ? 'scale(1)'
            : isNearBottom
              ? 'translateY(12px) scale(0.85)'
              : 'translateY(-12px) scale(0.85)',
          pointerEvents: isOpen ? 'auto' : 'none',
          whiteSpace: 'nowrap',
          zIndex: 10000,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.filter = 'brightness(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'scale(1)' : 'scale(0.85)';
          e.currentTarget.style.filter = 'none';
        }}
      >
        {/* White circle with blue Telegram paper airplane icon */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            style={{ display: 'block', transform: 'translate(-1px, 0.5px)' }}
          >
            <path
              d="M21.5 3.5L2 11.2L8.5 13.7L18 7.5L10.5 15.5V20.5L13.8 17.2L17.5 20L21.5 3.5Z"
              fill="#24A1DE"
            />
          </svg>
        </div>

        <span
          style={{
            color: '#FFFFFF',
            fontFamily: KENO_FONTS.ui,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: '0.01em',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          @Fastkenosupportteam
        </span>
      </div>

      {/* Draggable Customer Support Trigger Button */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        aria-label={isOpen ? 'Close Customer Support' : 'Hold to drag, click for Support'}
        title="Hold & drag to move • Click for Support"
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: '50%',
          background: isDragging
            ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
            : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          border: '1.5px solid rgba(113, 206, 150, 0.5)',
          boxShadow: isDragging
            ? '0 8px 24px rgba(16, 185, 129, 0.6), 0 3px 10px rgba(0, 0, 0, 0.6)'
            : '0 4px 14px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          padding: 0,
          color: '#FFFFFF',
          transition: isDragging ? 'none' : 'transform 0.18s ease, box-shadow 0.18s ease',
          transform: isDragging ? 'scale(1.12)' : 'scale(1)',
          outline: 'none',
          touchAction: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #34D399 0%, #10B981 100%)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
          }
        }}
      >
        {isOpen ? (
          <X size={20} strokeWidth={2.4} style={{ pointerEvents: 'none' }} />
        ) : (
          <Headphones size={20} strokeWidth={2.2} style={{ pointerEvents: 'none' }} />
        )}
      </button>
    </div>
  );
};
