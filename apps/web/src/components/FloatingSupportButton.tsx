import React, { useState, useEffect, useRef } from 'react';
import { Headphones, X } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';

interface FloatingSupportButtonProps {
  telegramUrl?: string;
}

export const FloatingSupportButton: React.FC<FloatingSupportButtonProps> = ({
  telegramUrl = 'https://t.me/fastkenogames',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        bottom: 22,
        right: 20,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        userSelect: 'none',
      }}
    >
      {/* Floating Telegram Action Pill (Appears above the button, matching Image 2) */}
      <div
        onClick={handleTelegramClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleTelegramClick(e as any);
          }
        }}
        title="Open Telegram Support"
        style={{
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#24A1DE',
          borderRadius: 9999,
          padding: '7px 18px 7px 8px',
          boxShadow: '0 6px 20px rgba(36, 161, 222, 0.5), 0 2px 8px rgba(0, 0, 0, 0.35)',
          cursor: 'pointer',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          e.currentTarget.style.filter = 'brightness(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)';
          e.currentTarget.style.filter = 'none';
        }}
      >
        {/* White circle with blue Telegram paper airplane icon */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            style={{ display: 'block', transform: 'translate(-1px, 0.5px)' }}
          >
            <path
              d="M21.5 3.5L2 11.2L8.5 13.7L18 7.5L10.5 15.5V20.5L13.8 17.2L17.5 20L21.5 3.5Z"
              fill="#24A1DE"
            />
          </svg>
        </div>

        {/* Bold white 'Telegram' text matching Image 2 */}
        <span
          style={{
            color: '#FFFFFF',
            fontFamily: KENO_FONTS.ui,
            fontSize: 15.5,
            fontWeight: 800,
            letterSpacing: '0.01em',
            lineHeight: 1,
          }}
        >
          Telegram
        </span>
      </div>

      {/* Red Circular Floating Trigger Button (Matching Image 1 & Image 2) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close Customer Support' : 'Open Customer Support'}
        title={isOpen ? 'Close' : 'Customer Support'}
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: '#D31E28',
          border: 'none',
          boxShadow: '0 4px 16px rgba(211, 30, 40, 0.48), 0 2px 6px rgba(0, 0, 0, 0.35)',
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
          e.currentTarget.style.transform = 'scale(1.06)';
          e.currentTarget.style.background = '#E0232E';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = '#D31E28';
        }}
      >
        {isOpen ? (
          <X size={26} strokeWidth={2.6} style={{ transition: 'transform 0.15s ease' }} />
        ) : (
          <Headphones size={27} strokeWidth={2.4} style={{ transition: 'transform 0.15s ease' }} />
        )}
      </button>
    </div>
  );
};
