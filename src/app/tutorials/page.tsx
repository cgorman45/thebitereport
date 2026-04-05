'use client';

import Header from '@/components/Header';

const TUTORIALS = [
  {
    category: 'Knots',
    categoryColor: '#f59e0b',
    items: [
      {
        title: 'FG Knot',
        description: 'The strongest braid-to-fluorocarbon connection',
        search: 'fg+knot+fishing+tutorial',
      },
      {
        title: 'San Diego Jam Knot',
        description: 'Quick, reliable terminal knot for jigs and hooks',
        search: 'san+diego+jam+knot+fishing+tutorial',
      },
      {
        title: 'Palomar Knot',
        description: 'Simple and strong knot for hooks and swivels',
        search: 'palomar+knot+fishing+tutorial',
      },
    ],
  },
  {
    category: 'Techniques',
    categoryColor: '#00d4ff',
    items: [
      {
        title: 'Jigging',
        description: 'Vertical jigging techniques for yellowtail and tuna',
        search: 'jigging+fishing+tutorial+yellowtail',
      },
      {
        title: 'Surface Iron',
        description: 'Casting surface iron for yellowtail and barracuda',
        search: 'surface+iron+fishing+tutorial',
      },
      {
        title: 'Fly-lining Live Bait',
        description: 'Techniques for fly-lining sardines and anchovies',
        search: 'fly+lining+live+bait+fishing+tutorial',
      },
      {
        title: 'Dropper Loop Rig',
        description: 'Bottom fishing rig for rockfish and lingcod',
        search: 'dropper+loop+rig+fishing+tutorial',
      },
    ],
  },
  {
    category: 'Gear Setup',
    categoryColor: '#22c55e',
    items: [
      {
        title: 'Conventional Reel Setup',
        description: 'Setting drag and line for offshore fishing',
        search: 'conventional+reel+setup+fishing+tutorial',
      },
      {
        title: 'Choosing the Right Rod',
        description: 'Matching rod action to your target species',
        search: 'choosing+fishing+rod+tutorial',
      },
    ],
  },
];

export default function TutorialsPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1a' }}>
      <Header />

      {/* Hero Section */}
      <section
        className="py-16 text-center"
        style={{
          borderBottom: '1px solid #1e2a42',
          background: 'linear-gradient(180deg, #0d1526 0%, #0a0f1a 100%)',
        }}
      >
        <h1
          className="text-3xl sm:text-4xl font-black tracking-tight"
          style={{ color: '#e2e8f0' }}
        >
          Fishing Tutorials
        </h1>
        <p
          className="mt-3 text-base sm:text-lg max-w-xl mx-auto px-4"
          style={{ color: '#8899aa' }}
        >
          Master essential techniques for Southern California sportfishing
        </p>
      </section>

      {/* Tutorial Cards Grid */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        {TUTORIALS.map((group) => (
          <div key={group.category} className="mb-12">
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-5"
              style={{ color: group.categoryColor }}
            >
              {group.category}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {group.items.map((tutorial) => (
                <div
                  key={tutorial.title}
                  className="rounded-xl p-5 flex flex-col justify-between transition-all duration-200"
                  style={{
                    backgroundColor: '#131b2e',
                    border: '1px solid #1e2a42',
                  }}
                >
                  <div>
                    <span
                      className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3"
                      style={{
                        color: group.categoryColor,
                        backgroundColor: `${group.categoryColor}15`,
                        border: `1px solid ${group.categoryColor}33`,
                      }}
                    >
                      {group.category}
                    </span>
                    <h3
                      className="text-base font-bold mb-1"
                      style={{ color: '#e2e8f0' }}
                    >
                      {tutorial.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: '#8899aa' }}
                    >
                      {tutorial.description}
                    </p>
                  </div>

                  <a
                    href={`https://www.youtube.com/results?search_query=${tutorial.search}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200"
                    style={{
                      backgroundColor: '#00d4ff18',
                      color: '#00d4ff',
                      border: '1px solid #00d4ff33',
                    }}
                  >
                    Watch Tutorial
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-[#8899aa] text-sm border-t border-[#1e2a42]">
        <p>The Bite Report &middot; Make Memories. Have Fun.</p>
        <p className="mt-1 text-xs">
          Data from NOAA, Open-Meteo, NDBC, Windy.com, and public fishing reports
        </p>
      </footer>
    </div>
  );
}
