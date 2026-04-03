import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

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
  title: 'The Bite Report | Southern California Fishing Intelligence',
  description:
    'Real-time fishing scores, tide data, weather conditions, and catch reports for Southern California ocean fishing. Plan your next trip with data-driven insights.',
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
        {children}
      </body>
    </html>
  );
}
