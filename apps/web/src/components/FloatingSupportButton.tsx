import React, { useState, useEffect, useRef } from 'react';
import { Headphones, X } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';

interface FloatingSupportButtonProps {
  telegramUrl?: string;
}

export const FloatingSupportButton: React.FC<FloatingSupportButtonProps> = ({
  telegramUrl = 'https://t.me/Fastkenosupportteam',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // Initially hidden at the top so it doesn't cover or stack on the game grid/controls
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Slide down to appear / slide up to disappear listener
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = (e.target === document || e.target === window
        ? document.documentElement
        : e.target) as HTMLElement;

      if (!target || typeof target.scrollTop !== 'number') return;
      const currentScrollTop = target.scrollTop;

      // When near the top, always hide so it never covers the betting grid or action controls
      if (currentScrollTop < 50) {
        setIsVisible(false);
        setIsOpen(false);
        lastScrollTopRef.current = currentScrollTop;
        return;
      }

      const diff = currentScrollTop - lastScrollTopRef.current;
      if (diff > 8) {
        // Sliding / scrolling down -> Appear
        setIsVisible(true);
      } else if (diff < -8) {
        // Sliding / scrolling up -> Disappear
        setIsVisible(false);
        setIsOpen(false);
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 8) {
        // Scrolling down -> Appear
        setIsVisible(true);
      } else if (e.deltaY < -8) {
        // Scrolling up -> Disappear
        setIsVisible(false);
        setIsOpen(false);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY || 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0]?.clientY || 0;
      const delta = touchStartYRef.current - currentY;

      // Finger moving up = page sliding down -> Appear
      if (delta > 14) {
        setIsVisible(true);
      }
      // Finger moving down = page sliding up towards top -> Disappear
      else if (delta < -14) {
        setIsVisible(false);
        setIsOpen(false);
      }
    };

    // Capture true ensures we catch scroll events on <main>, window, or any nested scroll view
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const handleTelegramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 18,
        right: 16,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        userSelect: 'none',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.85)',
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Floating Telegram Action Pill (Appears above the support trigger button) */}
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
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #24A1DE 0%, #1A8CC2 100%)',
          borderRadius: 9999,
          padding: '5px 14px 5px 6px',
          boxShadow: '0 4px 14px rgba(36, 161, 222, 0.4), 0 2px 6px rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.filter = 'brightness(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)';
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
            whiteSpace: 'nowrap',
          }}
        >
          @Fastkenosupportteam
        </span>
      </div>

      {/* Customer Support Trigger Button: Compact and themed in Fast Keno Emerald Green */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close Customer Support' : 'Open Customer Support'}
        title={isOpen ? 'Close Support' : 'Customer Support'}
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          border: '1px solid rgba(113, 206, 150, 0.45)',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          color: '#FFFFFF',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #34D399 0%, #10B981 100%)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        }}
      >
        {isOpen ? (
          <X size={20} strokeWidth={2.4} style={{ transition: 'transform 0.15s ease' }} />
        ) : (
          <Headphones size={20} strokeWidth={2.2} style={{ transition: 'transform 0.15s ease' }} />
        )}
      </button>
    </div>
  );
};
