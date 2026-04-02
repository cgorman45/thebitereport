'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import type { ChatMessage } from '@/lib/trips/types';
import TripCard from './TripCard';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
  onViewOnMap?: (mmsi: number) => void;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Render bot message text — handles **bold** markdown and newlines */
function BotText({ content }: { content: string }) {
  // Split on double newlines for paragraphs, single newlines for <br>
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line === '') return <div key={i} className="h-2" />;
        // Handle **bold** segments
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="leading-relaxed">
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={j} style={{ color: '#e2e8f0', fontWeight: 700 }}>
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      {/* Bot avatar */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
        style={{ backgroundColor: '#1e2a42', border: '1px solid #2a3a54' }}
        aria-hidden="true"
      >
        🎣
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ backgroundColor: '#131b2e', border: '1px solid #1e2a42' }}
      >
        <div className="flex items-center gap-1.5 h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#8899aa',
                animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatWindow({
  messages,
  onSendMessage,
  isTyping,
  onViewOnMap,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom whenever messages or typing indicator change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping]);

  function handleSend() {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    onSendMessage(text);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{
        backgroundColor: '#0a0f1a',
        border: '1px solid #1e2a42',
        minHeight: 0,
      }}
    >
      {/* Scrollable message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.map((msg, idx) =>
          msg.role === 'bot' ? (
            <div key={idx} className="flex items-end gap-2 mb-4">
              {/* Bot avatar */}
              <div
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base"
                style={{ backgroundColor: '#1e2a42', border: '1px solid #2a3a54' }}
                aria-hidden="true"
              >
                🎣
              </div>

              <div className="flex flex-col gap-2 max-w-[85%] min-w-0">
                {/* Bubble */}
                <div
                  className="px-4 py-3 rounded-2xl rounded-bl-sm text-sm"
                  style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e2a42',
                    color: '#c8d6e8',
                  }}
                >
                  <BotText content={msg.content} />
                </div>

                {/* Inline trip cards */}
                {msg.tripResults && msg.tripResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {msg.tripResults.slice(0, 4).map(trip => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onViewOnMap={onViewOnMap}
                      />
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <span className="text-xs pl-1" style={{ color: '#4a5a6e' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ) : (
            /* User message */
            <div key={idx} className="flex justify-end mb-4">
              <div className="flex flex-col items-end gap-1 max-w-[75%]">
                <div
                  className="px-4 py-3 rounded-2xl rounded-br-sm text-sm"
                  style={{
                    backgroundColor: '#0c2d4a',
                    border: '1px solid rgba(0, 212, 255, 0.18)',
                    color: '#e2e8f0',
                  }}
                >
                  {msg.content}
                </div>
                <span className="text-xs pr-1" style={{ color: '#4a5a6e' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1e2a42' }} />

      {/* Input area */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: '#0a0f1a' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#4a5a6e]"
          style={{
            color: '#e2e8f0',
            caretColor: '#00d4ff',
          }}
          aria-label="Chat message input"
          disabled={isTyping}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isTyping}
          aria-label="Send message"
          className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
          style={{
            backgroundColor: inputValue.trim() && !isTyping ? '#00d4ff' : '#1e2a42',
            color: inputValue.trim() && !isTyping ? '#0a0f1a' : '#4a5a6e',
          }}
        >
          {/* Send icon */}
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path
              d="M17.5 10L3.5 3l2.5 7-2.5 7 14-7z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Keyframe animation injected inline — avoids needing global CSS edits */}
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
