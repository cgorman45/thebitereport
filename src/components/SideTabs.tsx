'use client';

import { useState } from 'react';

interface SideTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  panel: React.ReactNode;
}

interface SideTabsProps {
  tabs: SideTab[];
}

export default function SideTabs({ tabs }: SideTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const toggle = (id: string) => {
    setActiveTab((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* Tab buttons — fixed on right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => toggle(tab.id)}
              className="group flex items-center gap-2 transition-all duration-300 rounded-l-lg overflow-hidden"
              style={{
                backgroundColor: isActive ? '#00d4ff' : '#131b2e',
                border: `1px solid ${isActive ? '#00d4ff' : '#1e2a42'}`,
                borderRight: 'none',
                padding: '10px 12px',
                color: isActive ? '#0a0f1a' : '#8899aa',
                boxShadow: isActive
                  ? '0 4px 20px rgba(0,212,255,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title={tab.label}
            >
              <span className="w-5 h-5 flex-shrink-0">{tab.icon}</span>
              <span
                className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300"
                style={{
                  maxWidth: isActive ? '120px' : '0px',
                  opacity: isActive ? 1 : 0,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slide-out panel */}
      <div
        className="fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out"
        style={{
          width: '380px',
          maxWidth: '90vw',
          transform: activeTab ? 'translateX(0)' : 'translateX(100%)',
          backgroundColor: '#0d1320',
          borderLeft: '1px solid #1e2a42',
          boxShadow: activeTab ? '-4px 0 24px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Panel header */}
        {activeTab && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              borderBottom: '1px solid #1e2a42',
              backgroundColor: '#131b2e',
            }}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#e2e8f0' }}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={() => setActiveTab(null)}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
              style={{ color: '#8899aa', backgroundColor: '#1e2a42' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Panel content */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
          {tabs.find((t) => t.id === activeTab)?.panel}
        </div>
      </div>

      {/* Backdrop */}
      {activeTab && (
        <div
          className="fixed inset-0 z-30 sm:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setActiveTab(null)}
        />
      )}
    </>
  );
}
