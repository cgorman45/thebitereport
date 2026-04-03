'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import { createConversation, processUserMessage } from '@/lib/trips/chatbot';
import type { ConversationState } from '@/lib/trips/types';

const TYPING_DELAY_MS = 800;

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<ConversationState>(() =>
    createConversation()
  );
  const [isTyping, setIsTyping] = useState(false);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending timeout on unmount
  useEffect(() => {
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (isTyping) return;

      // Immediately append the user message + start typing indicator
      setConversation(prev => {
        const withUser: ConversationState = {
          ...prev,
          messages: [
            ...prev.messages,
            { role: 'user', content: text, timestamp: Date.now() },
          ],
        };
        return withUser;
      });
      setIsTyping(true);

      // After delay, process and append bot reply
      pendingRef.current = setTimeout(() => {
        setConversation(prev => {
          // Re-run processUserMessage on the state that existed before we
          // manually added the user message, so we don't double-add it.
          // We need the state *without* the optimistic user message.
          const withoutOptimistic: ConversationState = {
            ...prev,
            messages: prev.messages.slice(0, -1), // remove the optimistic user msg
          };
          return processUserMessage(withoutOptimistic, text);
        });
        setIsTyping(false);
      }, TYPING_DELAY_MS);
    },
    [isTyping]
  );

  function handleToggle() {
    setIsOpen(prev => !prev);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <>
      {/* Inject pulse + panel animations */}
      <style>{`
        @keyframes chat-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(0, 212, 255, 0); }
        }
        @keyframes chat-panel-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* ── Floating panel ── */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 flex flex-col rounded-xl overflow-hidden"
          style={{
            width: '400px',
            height: '520px',
            backgroundColor: '#131b2e',
            border: '1px solid #1e2a42',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 212, 255, 0.08)',
            zIndex: 9999,
            animation: 'chat-panel-in 0.18s ease-out forwards',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              borderBottom: '1px solid #1e2a42',
              backgroundColor: '#0e1624',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: '#1e2a42' }}
                aria-hidden="true"
              >
                🎣
              </span>
              <div>
                <p className="text-sm font-bold leading-none" style={{ color: '#e2e8f0' }}>
                  Trip Planner Assistant
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 hover:brightness-125 active:scale-90"
              style={{
                backgroundColor: 'rgba(30, 42, 66, 0.8)',
                border: '1px solid #1e2a42',
                color: '#8899aa',
              }}
              aria-label="Close chat"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2l8 8M10 2L2 10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* ChatWindow fills remaining space */}
          <div className="flex-1 min-h-0">
            <ChatWindow
              messages={conversation.messages}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
            />
          </div>
        </div>
      )}

      {/* ── Circular trigger button ── */}
      <button
        onClick={handleToggle}
        aria-label={isOpen ? 'Close trip planner chat' : 'Open trip planner chat'}
        className="fixed bottom-6 right-6 flex items-center justify-center rounded-full transition-all duration-200 hover:brightness-110 active:scale-90"
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: '#00d4ff',
          color: '#0a0f1a',
          zIndex: 10000,
          animation: isOpen ? 'none' : 'chat-pulse 2.4s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.35)',
        }}
      >
        {isOpen ? (
          /* X icon when open */
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          /* Chat bubble icon when closed */
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
