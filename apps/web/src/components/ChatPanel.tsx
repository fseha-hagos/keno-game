import React, { useState } from 'react';
import { Send, ThumbsUp, Smile, CloudRain } from 'lucide-react';
import { KENO_FONTS } from '../theme/kenoTheme';

interface ChatMessage {
  id: string;
  user: string;
  avatarUrl?: string;
  avatarColor: string;
  text: string;
  upvotes: number;
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


export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        user: 'You',
        avatarColor: '#51b579',
        text: inputText.trim(),
        upvotes: 0,
      },
    ]);
    setInputText('');
  };

  const handleUpvote = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, upvotes: m.upvotes + 1 } : m)),
    );
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(27, 30, 31, 0.94)',
        borderLeft: '1px solid rgba(81, 181, 121, 0.2)',
        borderRadius: 16,
        overflow: 'hidden',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: KENO_FONTS.ui,
      }}
    >
      {/* Top Header: Live Online Users indicator matching mock_web .active-users */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(81, 181, 121, 0.2)',
          fontSize: 12,
          fontWeight: 700,
          color: '#E2E8F0',
        }}
      >
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
      </div>

      {/* Messages Stream */}
      <div
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
      </div>

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
            style={{
              background: 'linear-gradient(180deg, #4c8b65, #254632)',
              border: 'none',
              borderRadius: 3,
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: '#71ce96' }}>
              <Smile size={12} color="#71ce96" /> Emoji
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: '#71ce96' }}>
              GIF
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: '#71ce96' }}>
              <CloudRain size={12} color="#71ce96" /> Rain
            </span>
          </div>
          <span>160</span>
        </div>
      </form>
    </div>
  );
};
