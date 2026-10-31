import React, { useState, useEffect, useRef } from 'react';
import { Headphones, X } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';

interface FloatingSupportButtonProps {
  telegramUrl?: string;
}

const BUTTON_SIZE = 44;

export const FloatingSupportButton: React.FC<FloatingSupportButtonProps> = ({
  telegramUrl = 'https://t.me/Fastkenosupportteam',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect virtual keyboard on mobile to ensure support button never blocks typing or jumps around
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Monitor visualViewport height changes
    const initialHeight = window.innerHeight;
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const heightDiff = initialHeight - window.visualViewport.height;
        // Keyboard typically occupies > 140px
        setIsKeyboardOpen(heightDiff > 140);
      }
    };

    // 2. Also listen for focusin / focusout on form inputs
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      // Small delay before restoring to prevent flickering during focus transition between inputs
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && !active.isContentEditable)) {
          setIsKeyboardOpen(false);
        }
      }, 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    }
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

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
        bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        right: 14,
        zIndex: 9999,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        opacity: isKeyboardOpen ? 0 : 1,
        transform: isKeyboardOpen ? 'translateY(16px)' : 'translateY(0)',
        pointerEvents: isKeyboardOpen ? 'none' : 'auto',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* Floating Telegram Action Pill positioned right above the button */}
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
          bottom: BUTTON_SIZE + 10,
          right: 0,
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
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.85)',
          pointerEvents: isOpen ? 'auto' : 'none',
          whiteSpace: 'nowrap',
          zIndex: 10000,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1.03)';
          e.currentTarget.style.filter = 'brightness(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.85)';
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

      {/* Stacked Customer Support Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close Customer Support' : 'Customer Support'}
        title="Customer Support @Fastkenosupportteam"
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          border: '1.5px solid rgba(113, 206, 150, 0.5)',
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          color: '#FFFFFF',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
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
          <X size={20} strokeWidth={2.4} style={{ pointerEvents: 'none' }} />
        ) : (
          <Headphones size={20} strokeWidth={2.2} style={{ pointerEvents: 'none' }} />
        )}
      </button>
    </div>
  );
};
