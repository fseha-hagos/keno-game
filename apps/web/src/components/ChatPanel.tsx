import React, { useState } from 'react';
import { Send, ThumbsUp, Smile, CloudRain } from 'lucide-react';

interface ChatMessage {
  id: string;
  user: string;
  avatarColor: string;
  text: string;
  upvotes: number;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', user: 'j***k', avatarColor: '#F59E0B', text: 'Fam', upvotes: 1 },
  { id: '2', user: 'c***d', avatarColor: '#EF4444', text: 'Araaa minishe account layi yenabarewuni birr withdraw adaragubigni', upvotes: 2 },
  { id: '3', user: 'c***d', avatarColor: '#EF4444', text: 'Araaa min ayinati lebinati nw koyi irasachewu withdraw adrigo miwosduti', upvotes: 0 },
  { id: '4', user: 'i***p', avatarColor: '#06B6D4', text: 'ydmrrrr', upvotes: 1 },
  { id: '5', user: 's***r', avatarColor: '#84CC16', text: 'Rain', upvotes: 0 },
  { id: '6', user: 'z***w', avatarColor: '#A855F7', text: '🔥', upvotes: 1 },
  { id: '7', user: 'c***d', avatarColor: '#EF4444', text: 'Guys', upvotes: 0 },
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
        avatarColor: '#10B981',
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
        background: '#0B131D',
        borderLeft: '1px solid #162436',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Top Header: Live Online Users indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          borderBottom: '1px solid #162436',
          fontSize: 12,
          fontWeight: 800,
          color: '#E2E8F0',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: '#22C55E',
            boxShadow: '0 0 6px #22C55E',
          }}
        />
        <span>995</span>
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
              gap: 3,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: msg.avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 900,
                    color: '#FFFFFF',
                  }}
                >
                  {((msg.user && msg.user[0]) || 'U').toUpperCase()}
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8' }}>
                  {msg.user}
                </span>
              </div>

              {/* Upvote button */}
              <button
                type="button"
                onClick={() => handleUpvote(msg.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
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

      {/* Bottom Input Area */}
      <form
        onSubmit={handleSend}
        style={{
          padding: '10px',
          borderTop: '1px solid #162436',
          background: '#080E16',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#0E1724',
            border: '1px solid #1E2D3E',
            borderRadius: 8,
            padding: '4px 8px',
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
              color: '#F8FAFC',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <Send size={14} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#64748B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <Smile size={12} color="#FBBF24" /> GIF
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <CloudRain size={12} color="#38BDF8" /> Rain
            </span>
          </div>
          <span>160</span>
        </div>
      </form>
    </div>
  );
};
