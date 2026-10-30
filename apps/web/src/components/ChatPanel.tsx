import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ThumbsUp, Smile, CloudRain, Sparkles, X, ChevronDown } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';
import { useAuthStore } from '../store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
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
  { id: '1', user: 'j***k', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png', avatarColor: '#F59E0B', text: 'Fam', upvotes: 2 },
  { id: '2', user: 'c***d', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', avatarColor: '#b5ead7', text: 'Araaa minishe account layi yenabarewuni birr withdraw adaragubigni', upvotes: 3 },
  { id: '3', user: 'c***d', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', avatarColor: '#b5ead7', text: 'Araaa min ayinati lebinati nw koyi irasachewu withdraw adrigo miwosduti', upvotes: 1 },
  { id: '4', user: 'i***p', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png', avatarColor: '#c7ceea', text: 'ydmrrrr', upvotes: 4 },
  { id: '5', user: 's***r', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png', avatarColor: '#a2d729', text: 'Rain', upvotes: 2 },
  { id: '6', user: 'z***w', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png', avatarColor: '#ffb7b2', text: '🔥', upvotes: 5 },
  { id: '7', user: 'm***u', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png', avatarColor: '#b5ead7', text: 'Ere bamaryam', upvotes: 2 },
  { id: '8', user: 'm***o', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png', avatarColor: '#ffdab9', text: 'Guys', upvotes: 1 },
  { id: '9', user: 'b***k', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-5.png', avatarColor: '#38bdf8', text: '70 and 77 please 🙏', upvotes: 3 },
  { id: '10', user: '09***44', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-9.png', avatarColor: '#f59e0b', text: '3 hit out of 4, need one more!', upvotes: 2 },
  { id: '11', user: 'k***m', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-2.png', avatarColor: '#71ce96', text: 'Big win on 5 picks! 🔥', upvotes: 6 },
  { id: '12', user: 'd***a', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-10.png', avatarColor: '#c7ceea', text: 'Good luck everyone 🍀', upvotes: 4 },
  { id: '13', user: 't***e', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-6.png', avatarColor: '#a2d729', text: '10 birr and a dream 🚀', upvotes: 5 },
  { id: '14', user: '09***82', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-11.png', avatarColor: '#ffb7b2', text: 'Rain pls admin 🌧️', upvotes: 3 },
  { id: '15', user: 'h***s', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-13.png', avatarColor: '#ffdab9', text: 'Let’s hit that 80!', upvotes: 2 },
  { id: '16', user: 'y***n', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-15.png', avatarColor: '#38bdf8', text: '💥💥💥 wow', upvotes: 1 },
  { id: '17', user: 'a***b', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', avatarColor: '#b5ead7', text: 'ayzoh fam bet small first', upvotes: 4 },
  { id: '18', user: '07***19', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-16.png', avatarColor: '#F59E0B', text: 'አረ በስማም ዛሬ ተመችቶኛል', upvotes: 3 },
  { id: '19', user: 'f***e', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png', avatarColor: '#71ce96', text: '500 birr profit today let\'s go', upvotes: 5 },
  { id: '20', user: 'n***a', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png', avatarColor: '#c7ceea', text: '14 28 42 numbers incoming', upvotes: 2 },
  { id: '21', user: '09***91', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-5.png', avatarColor: '#a2d729', text: 'yene keno bet lol', upvotes: 1 },
  { id: '22', user: 'w***d', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png', avatarColor: '#ffb7b2', text: 'Rain dropped! 🎉', upvotes: 3 },
  { id: '23', user: 'l***k', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png', avatarColor: '#ffdab9', text: 'anyone hitting 7?', upvotes: 2 },
  { id: '24', user: 'g***t', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-2.png', avatarColor: '#38bdf8', text: 'Fast Keno best game honestly', upvotes: 4 },
  { id: '25', user: '09***63', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-9.png', avatarColor: '#b5ead7', text: 'minem ayidelem next round enashenifalen', upvotes: 3 },
  { id: '26', user: 'e***m', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png', avatarColor: '#F59E0B', text: '🔥 4 in a row!', upvotes: 5 },
  { id: '27', user: 'r***s', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png', avatarColor: '#71ce96', text: 'Good vibes only ✨', upvotes: 2 },
  { id: '28', user: 'p***h', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-6.png', avatarColor: '#c7ceea', text: 'Who picked 1 and 80?', upvotes: 1 },
  { id: '29', user: '07***52', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-10.png', avatarColor: '#a2d729', text: 'telebirr deposit was instant nice', upvotes: 4 },
  { id: '30', user: 'k***a', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-11.png', avatarColor: '#ffb7b2', text: '🎯 Keno Luck!', upvotes: 3 },
];

const EMOJI_LIST = ['🔥', '🎉', '🚀', '❤️', '👏', '🤑', '🍀', '🎲', '😂', '💎', '🎯', '🤞', '⚡', '💯', '💰', '✨'];
const QUICK_GIF_CHIPS = ['🎯 Keno Luck!', '💎 Big Win!', '🔥 On Fire!', '🚀 To the Moon!', '🍀 Lucky 80!'];

// Authentic community banter pool for live casino atmosphere
const LIVE_COMMUNITY_POOL = [
  { user: 'b***k', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-5.png', text: '70 and 77 please 🙏' },
  { user: '09***44', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-9.png', text: 'ydmrrrr' },
  { user: 'k***m', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-2.png', text: 'Big win on 5 picks! 🔥' },
  { user: 'd***a', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-10.png', text: 'Good luck everyone 🍀' },
  { user: 's***r', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png', text: 'Rain' },
  { user: 't***e', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-6.png', text: '10 birr and a dream 🚀' },
  { user: '09***82', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-11.png', text: 'Rain pls admin 🌧️' },
  { user: 'h***s', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-13.png', text: 'Let’s hit that 80!' },
  { user: 'y***n', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-15.png', text: '💥💥💥' },
  { user: 'i***p', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png', text: 'min new zarei luck 😂' },
  { user: 'a***b', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', text: 'ayzoh fam bet smart' },
  { user: 'z***w', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png', text: '🔥 winning streak' },
  { user: 'm***u', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png', text: 'Ere bamaryam' },
  { user: '07***19', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-16.png', text: 'አረ በስማም ዛሬ አሪፍ ነው' },
  { user: 'f***e', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png', text: 'telebirr deposit confirmed instant' },
  { user: 'n***a', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png', text: '14 28 42 let\'s go!' },
  { user: 'w***d', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png', text: 'Rain dropped! 🎉' },
  { user: 'g***t', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-2.png', text: 'Fast Keno to the moon 🚀' },
  { user: 'e***m', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png', text: '🔥 3 out of 3 hit!' },
  { user: 'p***h', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-6.png', text: 'Who picked 1 and 80?' },
  { user: '07***52', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-10.png', text: '500 birr on next round 💰' },
  { user: 'k***a', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-11.png', text: '🎯 Keno Luck!' },
  { user: '09***12', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png', text: 'congrats everyone 🎉' },
  { user: 't***f', avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png', text: 'yessss hit it!' },
];

const LOCAL_STORAGE_LIKES_KEY = 'fast_keno_liked_messages';

interface ChatPanelProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onClose, isMobile = false }) => {
  const { user, isAuthenticated } = useAuthStore();
  const isOnline = useGameStore((state) => state.isOnline);

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifMenu, setShowGifMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Live online player count (fluctuates organically while online)
  const [onlineCount, setOnlineCount] = useState(3557);

  // Single-like tracking per user per comment
  const [likedMessageIds, setLikedMessageIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LIKES_KEY);
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Recent like pop animation trigger
  const [recentLikedId, setRecentLikedId] = useState<string | null>(null);

  // Smart scrolling & unread indicator state
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isScrolledUpRef = useRef(false);
  isScrolledUpRef.current = isScrolledUp;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'nearest' });
    setHasNewBelow(false);
  }, []);

  // Monitor scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distanceToBottom < 65;
    setIsScrolledUp(!isAtBottom);
    if (isAtBottom) {
      setHasNewBelow(false);
    }
  }, []);

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

  // 1. Live fluctuating online user count
  useEffect(() => {
    if (!isOnline) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const jitterOnlineCount = () => {
      const delay = 3500 + Math.random() * 3200; // 3.5s - 6.7s
      timeoutId = setTimeout(() => {
        setOnlineCount((prev) => {
          const delta = Math.floor(Math.random() * 8) - 3;
          const next = prev + delta;
          if (next < 3520) return prev + Math.floor(Math.random() * 4) + 1;
          if (next > 3585) return prev - Math.floor(Math.random() * 4) - 1;
          return next;
        });
        jitterOnlineCount();
      }, delay);
    };

    jitterOnlineCount();
    return () => clearTimeout(timeoutId);
  }, [isOnline]);

  // 2. Fetch initial messages and listen for live WebSocket events
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
          setTimeout(() => scrollToBottom('auto'), 120);
        }
      } catch {
        // Fallback to rich starter messages
      }
    };

    fetchMessages();

    // Listen for live broadcast messages from socket gateway
    const unsubscribeChat = socketService.onChatMessage((data: any) => {
      if (!data) return;
      setMessages((prev) => {
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

      if (isScrolledUpRef.current) {
        setHasNewBelow(true);
      } else {
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
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
  }, [scrollToBottom]);

  // 3. Live community player chatter & organic reactions simulator
  useEffect(() => {
    if (!isOnline) return;

    // Organic community chat message every 6 to 12 seconds
    let chatTimer: ReturnType<typeof setTimeout>;
    const scheduleNextCommunityMessage = () => {
      const interval = 6000 + Math.random() * 6000; // 6s - 12s
      chatTimer = setTimeout(() => {
        const template = LIVE_COMMUNITY_POOL[Math.floor(Math.random() * LIVE_COMMUNITY_POOL.length)]!;
        const newMsg: ChatMessage = {
          id: `live-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user: template.user,
          avatarUrl: template.avatarUrl,
          avatarColor: getUserColor(template.user),
          text: template.text,
          upvotes: Math.random() > 0.6 ? 1 : 0,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          // Limit to recent 120 messages in memory
          const updated = [...prev, newMsg];
          return updated.length > 120 ? updated.slice(updated.length - 120) : updated;
        });

        if (isScrolledUpRef.current) {
          setHasNewBelow(true);
        } else {
          setTimeout(() => scrollToBottom('smooth'), 60);
        }

        scheduleNextCommunityMessage();
      }, interval);
    };

    scheduleNextCommunityMessage();

    // Organic like reaction on recent messages every 10 to 18 seconds
    let likeTimer: ReturnType<typeof setTimeout>;
    const scheduleNextCommunityLike = () => {
      const interval = 10000 + Math.random() * 8000; // 10s - 18s
      likeTimer = setTimeout(() => {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          // Pick a random message from last 15 messages
          const candidateSlice = prev.slice(-15);
          const target = candidateSlice[Math.floor(Math.random() * candidateSlice.length)]!;
          return prev.map((m) => (m.id === target.id ? { ...m, upvotes: m.upvotes + 1 } : m));
        });
        scheduleNextCommunityLike();
      }, interval);
    };

    scheduleNextCommunityLike();

    return () => {
      clearTimeout(chatTimer);
      clearTimeout(likeTimer);
    };
  }, [isOnline, scrollToBottom]);

  // 4. Send message handler (works via Send button click, tap on mobile, and Enter key)
  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) {
      e.preventDefault();
    }
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

    // Optimistic UI append immediately
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
    setHasNewBelow(false);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
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
      // Optimistic message remains visible so user experience is smooth
    } finally {
      setIsSending(false);
    }
  };

  // 5. Single-like per comment enforcement: toggle like / unlike
  const handleUpvote = async (id: string) => {
    const isAlreadyLiked = likedMessageIds.has(id);
    const nextLiked = new Set(likedMessageIds);

    if (isAlreadyLiked) {
      // Unlike (toggle off)
      nextLiked.delete(id);
      setLikedMessageIds(nextLiked);
      try {
        localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(Array.from(nextLiked)));
      } catch {}

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, upvotes: Math.max(0, m.upvotes - 1) } : m)),
      );

      try {
        socketService.likeChatMessage(id, 'unlike');
        await apiClient.post(`/api/v1/chat/messages/${id}/like`, { action: 'unlike' });
      } catch {}
    } else {
      // Like (single like per comment)
      nextLiked.add(id);
      setLikedMessageIds(nextLiked);
      try {
        localStorage.setItem(LOCAL_STORAGE_LIKES_KEY, JSON.stringify(Array.from(nextLiked)));
      } catch {}

      // Pop animation
      setRecentLikedId(id);
      setTimeout(() => setRecentLikedId(null), 500);

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, upvotes: m.upvotes + 1 } : m)),
      );

      try {
        socketService.likeChatMessage(id, 'like');
        await apiClient.post(`/api/v1/chat/messages/${id}/like`, { action: 'like' });
      } catch {}
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

  const charsLeft = 160 - inputText.length;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 320,
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
      {/* Top Header: Live Online Users indicator with breathing pulse dot */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            className={isOnline ? 'fast-keno-live-dot-pulsing' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: isOnline ? '#71ce96' : '#64748b',
              boxShadow: isOnline ? '0 0 6px #71ce96' : 'none',
              transition: 'background-color 0.3s ease',
            }}
          />
          <span
            style={{
              color: isOnline ? '#71ce96' : '#94a3b8',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.2px',
            }}
          >
            {isOnline ? onlineCount.toLocaleString() : 'Offline'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)' }}>online</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 10,
              background: 'rgba(113, 206, 150, 0.15)',
              color: '#71ce96',
              fontWeight: 700,
              border: '1px solid rgba(113, 206, 150, 0.25)',
              letterSpacing: '0.3px',
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
        onScroll={handleScroll}
        className="fast-keno-chat-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          scrollBehavior: 'smooth',
        }}
      >
        {messages.map((msg) => {
          const isLikedByMe = likedMessageIds.has(msg.id);
          const isPopping = recentLikedId === msg.id;

          return (
            <div
              key={msg.id}
              className="fast-keno-chat-msg-enter"
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
                      border: '1px solid rgba(255, 255, 255, 0.1)',
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

                {/* Single Like per User per Comment Button */}
                <button
                  type="button"
                  onClick={() => handleUpvote(msg.id)}
                  title={isLikedByMe ? 'You liked this comment (click to unlike)' : 'Like comment'}
                  className={isPopping ? 'fast-keno-like-popping' : ''}
                  style={{
                    background: isLikedByMe ? 'rgba(113, 206, 150, 0.15)' : 'transparent',
                    border: isLikedByMe ? '1px solid rgba(113, 206, 150, 0.35)' : '1px solid transparent',
                    borderRadius: 12,
                    color: isLikedByMe || msg.upvotes > 0 ? '#71ce96' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 10,
                    fontWeight: isLikedByMe ? 700 : 500,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {msg.upvotes > 0 && (
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{msg.upvotes}</span>
                  )}
                  <ThumbsUp
                    size={11}
                    fill={isLikedByMe ? '#71ce96' : 'none'}
                    color={isLikedByMe || msg.upvotes > 0 ? '#71ce96' : '#64748B'}
                  />
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
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New messages below" indicator when scrolled up */}
      {hasNewBelow && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          style={{
            position: 'absolute',
            bottom: 74,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, #2a3e32, #1b2820)',
            border: '1px solid #51b579',
            borderRadius: 20,
            padding: '4px 12px',
            color: '#71ce96',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            zIndex: 40,
            animation: 'chatMsgSlideIn 0.2s ease-out',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#71ce96',
              boxShadow: '0 0 6px #71ce96',
            }}
          />
          <span>New messages</span>
          <ChevronDown size={13} />
        </button>
      )}

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
            animation: 'chatMsgSlideIn 0.15s ease-out',
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
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
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
            animation: 'chatMsgSlideIn 0.15s ease-out',
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
                  transition: 'background 0.15s ease',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Input Area: Supports both Enter key and clicking/tapping Send button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
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
            border: isInputFocused ? '1px solid rgba(113, 206, 150, 0.6)' : '1px solid rgba(81, 181, 121, 0.2)',
            borderRadius: 4,
            padding: '4px 6px',
            marginBottom: 6,
            boxShadow: isInputFocused ? '0 0 8px rgba(113, 206, 150, 0.2)' : 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <input
            type="text"
            placeholder="Send message"
            value={inputText}
            maxLength={160}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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
            type="button"
            disabled={!inputText.trim() || isSending}
            onMouseDown={(e) => {
              // Crucial: prevent input blur on desktop so click reliably triggers
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              // Crucial: trigger send on touch before mobile keyboard dismissal shifts layout
              if (inputText.trim() && !isSending) {
                e.preventDefault();
                handleSend();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              background: inputText.trim()
                ? 'linear-gradient(180deg, #4c8b65, #254632)'
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 4,
              color: '#FFFFFF',
              cursor: inputText.trim() ? 'pointer' : 'default',
              padding: '5px 10px',
              minWidth: 34,
              minHeight: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              transition: 'background 0.15s ease, transform 0.1s ease',
            }}
            title="Send message"
          >
            <Send size={14} style={{ pointerEvents: 'none' }} />
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
                transition: 'color 0.15s ease',
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
                transition: 'color 0.15s ease',
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
                transition: 'color 0.15s ease',
              }}
            >
              <CloudRain size={12} color="#71ce96" /> Rain
            </span>
          </div>

          <span
            style={{
              color: charsLeft < 20 ? '#f59e0b' : charsLeft === 0 ? '#ff5c5c' : '#a0a0a0',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {charsLeft}
          </span>
        </div>
      </form>
    </div>
  );
};
