'use client';

import Header from '@/components/Header';
import SmsAlertSignup from '@/components/SmsAlertSignup';

const VIDEO_CARDS = [
  {
    title: 'BD Outdoors SoCal Fishing Report',
    description: 'Weekly SoCal fishing report from BD Outdoors covering offshore and inshore action.',
    query: 'BD+Outdoors+SoCal+fishing+report',
  },
  {
    title: 'SoCal Salty Fishing Report',
    description: 'Local fishing reports and tips from the SoCal Salty crew.',
    query: 'SoCal+Salty+fishing+report',
  },
  {
    title: 'San Diego Fishing Report This Week',
    description: 'The latest weekly fishing report covering San Diego waters.',
    query: 'San+Diego+fishing+report+this+week',
  },
  {
    title: 'Southern California Yellowtail Fishing',
    description: 'Yellowtail action up and down the Southern California coast.',
    query: 'Southern+California+yellowtail+fishing',
  },
  {
    title: 'San Diego Sportfishing Charter',
    description: 'Charter boat reports and catches from San Diego landings.',
    query: 'San+Diego+sportfishing+charter',
  },
];

const QUICK_LINKS = [
  {
    name: 'BloodyDecks',
    url: 'https://www.bloodydecks.com',
    description: 'The largest saltwater fishing forum on the West Coast. Trip reports, tackle talk, and real-time intel from anglers on the water.',
  },
  {
    name: 'San Diego Fish Reports',
    url: 'https://www.fishreports.com/sandiego',
    description: 'Daily fish counts and reports from every San Diego landing, updated each morning.',
  },
  {
    name: '976-Tuna',
    url: 'https://www.976-tuna.com',
    description: 'Recorded fishing reports and conditions for Southern California offshore and coastal waters.',
  },
];

export default function LocalIntelPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1a' }}>
      <Header />

      {/* Hero Section */}
      <section className="py-16 px-4 text-center" style={{ borderBottom: '1px solid #1e2a42' }}>
        <h1
          className="text-3xl sm:text-4xl font-black uppercase tracking-widest"
          style={{ color: '#e2e8f0' }}
        >
          Local <span style={{ color: '#00d4ff' }}>Intel</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base max-w-xl mx-auto" style={{ color: '#8899aa' }}>
          Latest fishing reports and videos from Southern California waters
        </p>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Featured Videos */}
        <section>
          <h2
            className="text-lg font-bold uppercase tracking-wider mb-6"
            style={{ color: '#e2e8f0' }}
          >
            Featured Videos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VIDEO_CARDS.map((card) => (
              <a
                key={card.query}
                href={`https://www.youtube.com/results?search_query=${card.query}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e2a42',
                }}
              >
                {/* Thumbnail placeholder */}
                <div
                  className="relative w-full flex items-center justify-center"
                  style={{
                    aspectRatio: '16 / 9',
                    background: 'linear-gradient(135deg, #0d1526 0%, #162033 50%, #0d1526 100%)',
                  }}
                >
                  {/* Play button */}
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 56,
                      height: 56,
                      backgroundColor: 'rgba(0, 212, 255, 0.15)',
                      border: '2px solid #00d4ff',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="#00d4ff"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Card body */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-1" style={{ color: '#e2e8f0' }}>
                    {card.title}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: '#8899aa' }}>
                    {card.description}
                  </p>
                  <span
                    className="text-xs font-medium"
                    style={{ color: '#00d4ff' }}
                  >
                    Watch on YouTube &rarr;
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="mt-14">
          <h2
            className="text-lg font-bold uppercase tracking-wider mb-6"
            style={{ color: '#e2e8f0' }}
          >
            Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl p-5 transition-transform duration-200 hover:scale-[1.02]"
                style={{
                  backgroundColor: '#131b2e',
                  border: '1px solid #1e2a42',
                }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#e2e8f0' }}>
                  {link.name}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: '#8899aa' }}>
                  {link.description}
                </p>
              </a>
            ))}
          </div>
        </section>
        {/* SMS Alert Signup */}
        <section className="mt-14">
          <h2
            className="text-lg font-bold uppercase tracking-wider mb-6"
            style={{ color: '#e2e8f0' }}
          >
            Stay in the Loop
          </h2>
          <div className="max-w-md">
            <SmsAlertSignup />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-sm border-t" style={{ color: '#8899aa', borderColor: '#1e2a42' }}>
        <p>The Bite Report &middot; Make Memories. Have Fun.</p>
        <p className="mt-1 text-xs">
          Data from NOAA, Open-Meteo, NDBC, Windy.com, and public fishing reports
        </p>
      </footer>
    </div>
  );
}
