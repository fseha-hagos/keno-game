import React, { useState, useEffect, useRef } from 'react';
import { Send, ThumbsUp, Smile, CloudRain, Sparkles, X } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { socketService } from '../services/socket';

interface ChatMessage {
  id: string;
  user: string;
  userId?: string;
  avatarUrl?: string;
  avatarColor: string;
  text: string;
  upvotes: number;
  createdAt?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', user: 'j***k', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png', avatarColor: '#F59E0B', text: 'Fam', upvotes: 1 },
  { id: '2', user: 'c***d', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', avatarColor: '#b5ead7', text: 'Araaa minishe account layi yenabarewuni birr withdraw adaragubigni', upvotes: 2 },
  { id: '3', user: 'c***d', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', avatarColor: '#b5ead7', text: 'Araaa min ayinati lebinati nw koyi irasachewu withdraw adrigo miwosduti', upvotes: 0 },
  { id: '4', user: 'i***p', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png', avatarColor: '#c7ceea', text: 'ydmrrrr', upvotes: 1 },
  { id: '5', user: 's***r', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png', avatarColor: '#a2d729', text: 'Rain', upvotes: 0 },
  { id: '6', user: 'z***w', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png', avatarColor: '#ffb7b2', text: '🔥', upvotes: 1 },
  { id: '7', user: 'm***u', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png', avatarColor: '#b5ead7', text: 'Ere bamaryam', upvotes: 1 },
  { id: '8', user: 'm***o', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png', avatarColor: '#ffdab9', text: 'Guys', upvotes: 0 },
];

const EMOJI_LIST = ['🔥', '🎉', '🚀', '❤️', '👏', '🤑', '🍀', '🎲', '😂', '💎', '🎯', '🤞', '⚡', '💯', '💰', '✨'];
const QUICK_GIF_CHIPS = ['🎯 Keno Luck!', '💎 Big Win!', '🔥 On Fire!', '🚀 To the Moon!', '🍀 Lucky 80!'];

interface ChatPanelProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose, isMobile = false }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifMenu, setShowGifMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'nearest' });
  };

  // Mask username helper (e.g. "alexander" -> "a***r")
  const getMaskedUsername = (name?: string) => {
    if (!name) return 'Guest';
    const clean = name.trim();
    if (clean.length <= 2) return `${clean[0]}*`;
    return `${clean[0]}***${clean[clean.length - 1]}`;
  };

  // User avatar colors
  const getUserColor = (name?: string) => {
    const colors = ['#71ce96', '#f59e0b', '#b5ead7', '#c7ceea', '#a2d729', '#ffb7b2', '#ffdab9', '#38bdf8'];
    if (!name) return colors[0]!;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length]!;
  };

  // Load initial messages from REST API on mount
  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const res = await apiClient.get('/api/v1/chat/messages?limit=60');
        if (isMounted && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: ChatMessage[] = res.data.map((m: any) => ({
            id: String(m.id),
            user: m.username,
            userId: m.userId,
            avatarUrl: m.avatarUrl,
            avatarColor: m.avatarColor || getUserColor(m.username),
            text: m.text,
            upvotes: m.upvotes || 0,
            createdAt: m.createdAt,
          }));
          setMessages(mapped);
          setTimeout(() => scrollToBottom('auto'), 100);
        }
      } catch {
        // Fallback to initial starter messages if API not available
      }
    };

    fetchMessages();

    // Listen for live broadcast messages from socket gateway
    const unsubscribeChat = socketService.onChatMessage((data: any) => {
      if (!data) return;
      setMessages((prev) => {
        // If message already exists (e.g. from optimistic send), update it
        const exists = prev.some((m) => m.id === String(data.id));
        if (exists) {
          return prev.map((m) => (m.id === String(data.id) ? { ...m, ...data } : m));
        }
        return [
          ...prev,
          {
            id: String(data.id || Date.now()),
            user: data.username || 'Player',
            userId: data.userId,
            avatarUrl: data.avatarUrl,
            avatarColor: data.avatarColor || getUserColor(data.username),
            text: data.text,
            upvotes: data.upvotes || 0,
            createdAt: data.createdAt,
          },
        ];
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    });

    // Listen for live like reactions
    const unsubscribeLikes = socketService.onChatLiked((likeData) => {
      if (!likeData?.messageId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === String(likeData.messageId) ? { ...m, upvotes: likeData.upvotes } : m,
        ),
      );
    });

    return () => {
      isMounted = false;
      unsubscribeChat();
      unsubscribeLikes();
    };
  }, []);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageContent = (customText || inputText).trim();
    if (!messageContent || isSending) return;

    setIsSending(true);
    setShowEmojiPicker(false);
    setShowGifMenu(false);

    const displayName = isAuthenticated && user?.username
      ? getMaskedUsername(user.username)
      : 'You';

    const avatar = (user as any)?.avatarUrl || 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png';
    const color = getUserColor(displayName);
    const tempId = `temp-${Date.now()}`;

    // 1. Optimistic UI update
    const optimisticMessage: ChatMessage = {
      id: tempId,
      user: displayName,
      userId: user?.id,
      avatarUrl: avatar,
      avatarColor: color,
      text: messageContent,
      upvotes: 0,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      // 2. Persist to API & broadcast across all WebSocket players
      const res = await apiClient.post('/api/v1/chat/messages', {
        userId: user?.id,
        username: displayName,
        avatarUrl: avatar,
        avatarColor: color,
        text: messageContent,
      });

      if (res.data?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: String(res.data.id) } : m)),
        );
      }
    } catch {
      // Keep optimistic message displayed so user experience is not disrupted
    } finally {
      setIsSending(false);
    }
  };

  const handleUpvote = async (id: string) => {
    // 1. Optimistic increment
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, upvotes: m.upvotes + 1 } : m)),
    );

    // 2. Send to API / socket
    try {
      socketService.likeChatMessage(id);
      await apiClient.post(`/api/v1/chat/messages/${id}/like`);
    } catch {
      // Ignore like errors gracefully
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => `${prev}${emoji}`);
  };

  const handleRainClick = () => {
    handleSend(undefined, '🌧️ Rain! Good luck everyone!');
  };

  const handleGifChipClick = (chip: string) => {
    handleSend(undefined, chip);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: isMobile ? 'rgba(20, 24, 26, 0.98)' : 'rgba(27, 30, 31, 0.94)',
        border: isMobile ? 'none' : '1px solid rgba(81, 181, 121, 0.2)',
        borderRadius: isMobile ? 0 : 16,
        overflow: 'hidden',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: KENO_FONTS.ui,
        position: 'relative',
      }}
    >
      {/* Top Header: Live Online Users indicator matching mock_web .active-users */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid rgba(81, 181, 121, 0.2)',
          fontSize: 12,
          fontWeight: 700,
          color: '#E2E8F0',
          background: isMobile ? 'rgba(27, 32, 35, 0.95)' : 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#71ce96',
              boxShadow: '0 0 6px #71ce96',
            }}
          />
          <span style={{ color: '#71ce96', fontWeight: 800 }}>3,557</span>
          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>online</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 10,
              background: 'rgba(113, 206, 150, 0.15)',
              color: '#71ce96',
              fontWeight: 700,
            }}
          >
            Live Room
          </span>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CBD5E1',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title="Close Chat"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {msg.avatarUrl ? (
                <img
                  src={msg.avatarUrl}
                  alt={msg.user}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    backgroundColor: '#333f46',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: msg.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 900,
                    color: '#000',
                  }}
                >
                  {msg.user[0]?.toUpperCase()}
                </div>
              )}

              <span
                className="fast-keno-player-name"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: msg.avatarColor,
                  cursor: 'pointer',
                }}
              >
                {msg.user}
              </span>

              <div style={{ flex: 1 }} />

              <button
                type="button"
                onClick={() => handleUpvote(msg.id)}
                title="Upvote comment"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: msg.upvotes > 0 ? '#71ce96' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 2,
                  transition: 'transform 0.1s ease',
                }}
              >
                {msg.upvotes > 0 && <span>{msg.upvotes}</span>}
                <ThumbsUp size={11} />
              </button>
            </div>

            <div
              style={{
                fontSize: 12,
                color: '#E2E8F0',
                lineHeight: 1.35,
                paddingLeft: 26,
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 10,
            right: 10,
            background: 'linear-gradient(180deg, #242b31, #1b2124)',
            border: '1px solid rgba(81, 181, 121, 0.35)',
            borderRadius: 8,
            padding: 8,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#71ce96' }}>Pick an Emoji</span>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 16,
                  cursor: 'pointer',
                  padding: '4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Quick GIF / Reaction Chips Popover */}
      {showGifMenu && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 10,
            right: 10,
            background: 'linear-gradient(180deg, #242b31, #1b2124)',
            border: '1px solid rgba(81, 181, 121, 0.35)',
            borderRadius: 8,
            padding: 8,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.8)',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#71ce96' }}>Quick Reactions</span>
            <button
              type="button"
              onClick={() => setShowGifMenu(false)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {QUICK_GIF_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleGifChipClick(chip)}
                style={{
                  background: 'linear-gradient(180deg, #333f46, #242b31)',
                  border: '1px solid rgba(81, 181, 121, 0.2)',
                  borderRadius: 4,
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  textAlign: 'left',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Input Area matching mock_web .fast-keno-chat-input-area */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '10px',
          borderTop: '1px solid rgba(81, 181, 121, 0.2)',
          background: 'linear-gradient(180deg, #333f46, #242b31)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #242b31, #333f46)',
            border: '1px solid rgba(81, 181, 121, 0.2)',
            borderRadius: 3,
            padding: '4px 6px',
            marginBottom: 6,
          }}
        >
          <input
            type="text"
            placeholder="Send message"
            value={inputText}
            maxLength={160}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 12,
              outline: 'none',
              fontFamily: KENO_FONTS.ui,
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            style={{
              background: inputText.trim()
                ? 'linear-gradient(180deg, #4c8b65, #254632)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 3,
              color: '#FFFFFF',
              cursor: inputText.trim() ? 'pointer' : 'default',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
          >
            <Send size={13} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#a0a0a0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              onClick={() => {
                setShowEmojiPicker((prev) => !prev);
                setShowGifMenu(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                color: showEmojiPicker ? '#51b579' : '#71ce96',
                fontWeight: 600,
              }}
            >
              <Smile size={12} color="#71ce96" /> Emoji
            </span>
            <span
              onClick={() => {
                setShowGifMenu((prev) => !prev);
                setShowEmojiPicker(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                color: showGifMenu ? '#51b579' : '#71ce96',
                fontWeight: 600,
              }}
            >
              <Sparkles size={11} color="#71ce96" /> GIF
            </span>
            <span
              onClick={handleRainClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                cursor: 'pointer',
                color: '#71ce96',
                fontWeight: 600,
              }}
            >
              <CloudRain size={12} color="#71ce96" /> Rain
            </span>
          </div>
          <span>{160 - inputText.length}</span>
        </div>
      </form>
    </div>
  );
};

