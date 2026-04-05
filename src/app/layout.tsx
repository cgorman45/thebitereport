import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import GlobalSideTabs from '@/components/GlobalSideTabs';
import AuthProvider from '@/components/auth/AuthProvider';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Bite Report | Make Memories. Have Fun.',
  description:
    'Make memories. Have fun. Real-time fishing scores, live fleet tracking, and trip planning for Southern California ocean sportfishing.',
  keywords:
    'fishing, Southern California, fishing report, tide chart, fishing score, SoCal fishing, sportfishing',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0f1a] text-[#e2e8f0]">
        <AuthProvider>
          {children}
          <GlobalSideTabs />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
