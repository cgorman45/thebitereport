'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ChatWindow from '@/components/trip-planner/ChatWindow';
import { createConversation, processUserMessage } from '@/lib/trips/chatbot';
import type { ConversationState } from '@/lib/trips/types';

export default function PlanYourTripPage() {
  const router = useRouter();
  const [conversation, setConversation] = useState<ConversationState>(
    () => createConversation()
  );
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = useCallback(
    (text: string) => {
      // Immediately append the user message + show typing indicator
      // We pass the current conversation into processUserMessage which returns
      // the full next state (user msg + bot reply). We split the reveal:
      // 1. Show user message right away (partial state with just user msg appended)
      // 2. After a typing delay, reveal the bot reply.

      setIsTyping(true);

      // Compute the full next state synchronously (deterministic rule engine)
      const nextState = processUserMessage(conversation, text);

      // Show only up through the user's new message while "typing"
      // nextState.messages = [...prevMsgs, userMsg, botMsg]
      // We want to display everything except the last bot message during typing.
      const messagesWithoutBotReply = nextState.messages.slice(0, -1);

      setConversation(prev => ({
        ...prev,
        messages: messagesWithoutBotReply,
      }));

      // Delay between 500–800ms to simulate bot thinking
      const delay = 500 + Math.random() * 300;

      setTimeout(() => {
        setIsTyping(false);
        // Now reveal the full state including the bot reply
        setConversation(nextState);
      }, delay);
    },
    [conversation]
  );

  function handleViewOnMap(mmsi: number) {
    // The fleet tracker page can read the MMSI from the URL or sessionStorage.
    // We push to the fleet tracker; the page handles highlighting the vessel.
    sessionStorage.setItem('focusMMSI', String(mmsi));
    router.push('/fleet-tracker');
  }

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0a0f1a',
        color: '#e2e8f0',
      }}
    >
      <Header />

      {/* Page header */}
      <div
        className="px-4 py-5 text-center"
        style={{ borderBottom: '1px solid #1e2a42' }}
      >
        <h2
          className="text-2xl font-black uppercase tracking-[0.12em]"
          style={{ color: '#e2e8f0' }}
        >
          Plan Your{' '}
          <span style={{ color: '#00d4ff' }}>Trip</span>
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#8899aa' }}>
          Tell me when you want to go and I&apos;ll find the perfect San Diego sportfishing trip
        </p>
      </div>

      {/* Chat area — fills remaining viewport height */}
      <main className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-4 py-4">
        <ChatWindow
          messages={conversation.messages}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          onViewOnMap={handleViewOnMap}
        />
      </main>

      {/* Subtle footer */}
      <footer
        className="py-3 text-center text-xs"
        style={{ color: '#4a5a6e', borderTop: '1px solid #1e2a42' }}
      >
        Trips depart from San Diego &middot; Seaforth Sportfishing &amp; Fisherman&apos;s Landing
      </footer>
    </div>
  );
}
