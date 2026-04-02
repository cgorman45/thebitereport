// ============================================================
// LLM INTEGRATION POINT
// ============================================================
// To replace this rule-based engine with a real AI:
//
// 1. Create an API route at /api/chat:
//    // src/app/api/chat/route.ts
//    import Anthropic from '@anthropic-ai/sdk';
//    import { TRIP_SCHEDULE } from '@/lib/trips/schedule';
//
//    const anthropic = new Anthropic();
//
//    export async function POST(req: Request) {
//      const { messages } = await req.json();
//      const tripContext = JSON.stringify(TRIP_SCHEDULE, null, 2);
//
//      const response = await anthropic.messages.create({
//        model: 'claude-sonnet-4-20250514',
//        max_tokens: 1024,
//        system: `You are a friendly, knowledgeable San Diego sportfishing trip
//          planner for The Bite Report. Help users find the perfect trip from
//          the following schedule:\n\n${tripContext}\n\nBe conversational and
//          enthusiastic about fishing. Ask clarifying questions about date,
//          trip length, group size, and target species. When recommending
//          trips return their IDs so the frontend can render trip cards.`,
//        messages: conversationHistory,
//      });
//
//      return Response.json({ reply: response.content[0].text });
//    }
//
// 2. Replace processUserMessage() with a fetch to /api/chat:
//    async function processUserMessage(state, input) {
//      const res = await fetch('/api/chat', {
//        method: 'POST',
//        body: JSON.stringify({ messages: state.messages }),
//      });
//      const { reply } = await res.json();
//      // parse trip IDs out of reply, look them up, attach to bot message
//    }
//
// 3. Pass TRIP_SCHEDULE as part of the system prompt context so the AI
//    can reference real boat names, prices, dates, and availability.
//
// 4. Consider streaming (anthropic.messages.stream) for a responsive feel.
// ============================================================

import type {
  ScheduledTrip,
  ChatMessage,
  ConversationState,
  ConversationStep,
} from './types';
import { filterTrips } from './schedule';

export type { ChatMessage, ConversationState };

// ---------------------------------------------------------------------------
// Conversation factory
// ---------------------------------------------------------------------------

export function createConversation(): ConversationState {
  return {
    step: 'greeting',
    date: null,
    duration: null,
    anglers: null,
    species: null,
    messages: [
      {
        role: 'bot',
        content:
          "Hey there! Welcome to The Bite Report trip planner. I can help you find the perfect fishing trip out of San Diego. \n\nWhen were you thinking of heading out?",
        timestamp: Date.now(),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

/**
 * Parse a natural-language date fragment into an ISO date string (YYYY-MM-DD).
 * Reference point is today's date. Returns null if nothing recognizable found.
 *
 * Handled patterns:
 *   "today", "tomorrow", "this friday", "next saturday",
 *   "april 5", "apr 7", "the 5th", "saturday", "friday",
 *   "this weekend", "next weekend"
 */
function parseDate(input: string): string | null {
  const lower = input.toLowerCase().trim();
  const now = new Date();
  // Work in local time — avoid UTC offset headaches for the user
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const addDays = (d: Date, n: number) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
  };

  // Simple keywords
  if (/\btoday\b/.test(lower)) return iso(today);
  if (/\btomorrow\b/.test(lower)) return iso(addDays(today, 1));

  // "this weekend" → coming Saturday
  if (/this\s+weekend/.test(lower)) {
    const day = today.getDay(); // 0=Sun, 6=Sat
    const daysUntilSat = day === 6 ? 7 : (6 - day);
    return iso(addDays(today, daysUntilSat));
  }
  // "next weekend" → Saturday after next
  if (/next\s+weekend/.test(lower)) {
    const day = today.getDay();
    const daysUntilSat = day === 6 ? 14 : (6 - day + 7);
    return iso(addDays(today, daysUntilSat));
  }

  const DAYS: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };

  const MONTHS: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8, sept: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // "April 5" / "apr 7" / "April 5th"
  const monthDayMatch = lower.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/
  );
  if (monthDayMatch) {
    const month = MONTHS[monthDayMatch[1]];
    const dayNum = parseInt(monthDayMatch[2], 10);
    if (month !== undefined && dayNum >= 1 && dayNum <= 31) {
      let year = today.getFullYear();
      const candidate = new Date(year, month, dayNum);
      if (candidate < today) year += 1; // push to next year if already past
      return iso(new Date(year, month, dayNum));
    }
  }

  // "the 5th" / "on the 7th"
  const ordinalMatch = lower.match(/\bthe\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (ordinalMatch) {
    const dayNum = parseInt(ordinalMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      // Find next occurrence of that day-of-month
      const candidate = new Date(today.getFullYear(), today.getMonth(), dayNum);
      if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
      return iso(candidate);
    }
  }

  // Check for weekday name — "this friday", "next monday", plain "friday"
  for (const [name, targetDay] of Object.entries(DAYS)) {
    const patterns = [
      new RegExp(`\\bthis\\s+${name}\\b`),
      new RegExp(`\\bnext\\s+${name}\\b`),
      new RegExp(`\\b${name}\\b`),
    ];
    for (let pi = 0; pi < patterns.length; pi++) {
      if (patterns[pi].test(lower)) {
        const currentDay = today.getDay();
        let diff = targetDay - currentDay;
        if (pi === 1) {
          // "next X" always means 7+ days out
          diff = diff <= 0 ? diff + 14 : diff + 7;
        } else {
          // plain or "this X" — find the soonest upcoming occurrence
          if (diff <= 0) diff += 7;
        }
        return iso(addDays(today, diff));
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Duration parsing
// ---------------------------------------------------------------------------

function parseDuration(input: string): string | null {
  const lower = input.toLowerCase();
  if (/\bhalf[\s-]?day\b|1\/2\s*day/.test(lower)) return '1/2 Day AM';
  if (/\b(3\/4|three[\s-]?quarter)[\s-]?day\b/.test(lower)) return '3/4 Day';
  if (/\bfull[\s-]?day\b/.test(lower)) return 'Full Day';
  if (/\bovernight\b|\bnight\b|\bnighter\b/.test(lower)) return 'Overnight';
  if (/1\.5[\s-]?day|one[\s-]and[\s-]a[\s-]half/.test(lower)) return '1.5 Day';
  if (/\b2[\s-]day\b|two[\s-]day/.test(lower)) return '2 Day';
  if (/\b3[\s-]day\b|three[\s-]day/.test(lower)) return '3 Day';
  if (/long[\s-]?range|multi[\s-]?day|extended/.test(lower)) return '3 Day';
  return null;
}

// ---------------------------------------------------------------------------
// Angler count parsing
// ---------------------------------------------------------------------------

function parseAnglers(input: string): number | null {
  const lower = input.toLowerCase();

  // Written-out numbers
  const words: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  if (/\bjust\s+me\b|\bsolo\b|\bby\s+myself\b|\balone\b|\bmyself\b/.test(lower)) return 1;

  // "2 of us", "a group of 5", "party of 3", "4 people", "6 guys"
  const patterns = [
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:of\s+us|people|anglers|guys|friends|of\s+them|pax)/,
    /(?:group|party|crew)\s+of\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/,
    /(?:me\s+and\s+|myself\s+and\s+)(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/,
    /\b(\d+)\s+(?:of\s+us|people|anglers)/,
  ];

  for (const pattern of patterns) {
    const m = lower.match(pattern);
    if (m) {
      const raw = m[1];
      const n = words[raw] ?? parseInt(raw, 10);
      if (!isNaN(n) && n > 0) {
        // "me and 3" means 4 total
        if (pattern.source.includes('me\\s+and|myself\\s+and')) return n + 1;
        return n;
      }
    }
  }

  // bare number like "4" or "just 2"
  const bare = lower.match(/\bjust\s+(\d+)\b|\b(\d+)\b/);
  if (bare) {
    const n = parseInt(bare[1] ?? bare[2], 10);
    if (n >= 1 && n <= 100) return n;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Species parsing
// ---------------------------------------------------------------------------

function parseSpecies(input: string): string | null {
  const lower = input.toLowerCase();
  if (/\btuna\b/.test(lower) && /\bbluefin\b/.test(lower)) return 'bluefin tuna';
  if (/\btuna\b/.test(lower) && /\byellowfin\b/.test(lower)) return 'yellowfin tuna';
  if (/\btuna\b/.test(lower)) return 'tuna';          // matches either species
  if (/\byellowtail\b|\byellow\s*tail\b/.test(lower)) return 'yellowtail';
  if (/\bwhite\s*seabass\b|\bwsb\b/.test(lower)) return 'white seabass';
  if (/\bseabass\b|\bsea\s*bass\b/.test(lower)) return 'white seabass';
  if (/\bcalico\b|\bbass\b/.test(lower)) return 'calico bass';
  if (/\blingcod\b|\blingk?\b/.test(lower)) return 'lingcod';
  if (/\brockfish\b|\bbottom\s*fish\b|\brock\s*cod\b/.test(lower)) return 'rockfish';
  if (/\bdorado\b|\bmahi\b/.test(lower)) return 'dorado';
  if (/\bwahoo\b|\bono\b/.test(lower)) return 'wahoo';
  if (/\banything\b|\bwhatever\b|\bdon.t\s+care\b|\bno\s+preference\b/.test(lower)) return null; // no filter
  return null;
}

// ---------------------------------------------------------------------------
// Response generators
// ---------------------------------------------------------------------------

const TRIP_ADJECTIVES = [
  'solid', 'great', 'epic', 'awesome', 'killer', 'dialed-in', 'productive',
];

function randomAdjective() {
  return TRIP_ADJECTIVES[Math.floor(Math.random() * TRIP_ADJECTIVES.length)];
}

function formatPrice(n: number) {
  return `$${n}`;
}

function formatTripSummary(t: ScheduledTrip): string {
  const spotsNote =
    t.spotsLeft <= 5
      ? ` (only ${t.spotsLeft} spots left — book fast!)`
      : t.spotsLeft <= 12
      ? ` (${t.spotsLeft} spots remaining)`
      : '';
  return (
    `**${t.boatName}** — ${t.duration} | ${t.departureDate} at ${t.departureTime} | ` +
    `${formatPrice(t.pricePerPerson)}/person${spotsNote}`
  );
}

function buildRecommendationMessage(
  trips: ScheduledTrip[],
  state: ConversationState
): string {
  if (trips.length === 0) {
    const parts: string[] = ["Hmm, I couldn't find any exact matches for those criteria."];
    if (state.date) parts.push("There might not be trips scheduled for that specific date.");
    parts.push(
      "Try loosening your filters — different dates, a different trip length, or any target species. I can also show you everything we've got for the week."
    );
    return parts.join(' ');
  }

  const displayTrips = trips.slice(0, 4); // cap at 4 to avoid overwhelming
  const more = trips.length > 4 ? ` (${trips.length - 4} more available)` : '';

  const lines = [
    `Here are ${displayTrips.length === 1 ? 'a' : 'some'} ${randomAdjective()} option${displayTrips.length > 1 ? 's' : ''} I found for you:`,
    '',
    ...displayTrips.map(t => `• ${formatTripSummary(t)}`),
  ];

  if (more) lines.push(`\n${more}`);

  lines.push(
    '',
    'Want more details on any of these, or should I adjust the search?'
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Intent detection helpers
// ---------------------------------------------------------------------------

function isAffirmative(input: string): boolean {
  return /\b(yes|yeah|yep|yup|sure|sounds good|perfect|great|ok|okay|absolutely|definitely|correct|that.?s right)\b/i.test(input);
}

function isNegative(input: string): boolean {
  return /\b(no|nope|nah|not really|negative|don.?t|not quite|different)\b/i.test(input);
}

function wantsMoreOptions(input: string): boolean {
  return /\b(more|other|different|else|change|adjust|another|other options|show me more)\b/i.test(input);
}

function wantsBooking(input: string): boolean {
  return /\b(book|reserve|sign up|purchase|buy|how do i|where do i)\b/i.test(input);
}

// ---------------------------------------------------------------------------
// Core message processor
// ---------------------------------------------------------------------------

export function processUserMessage(
  state: ConversationState,
  userInput: string
): ConversationState {
  // Clone state so we never mutate the original
  const next: ConversationState = {
    ...state,
    messages: [...state.messages],
    date: state.date,
    duration: state.duration,
    anglers: state.anglers,
    species: state.species,
  };

  // Append user message
  const userMsg: ChatMessage = {
    role: 'user',
    content: userInput,
    timestamp: Date.now(),
  };
  next.messages = [...next.messages, userMsg];

  // ── Opportunistically parse everything from every message ──────────────
  // This way if the user dumps all info at once ("I want a full day trip on
  // Friday for 4 people, targeting yellowtail") we handle it in one shot.

  const parsedDate = parseDate(userInput);
  const parsedDuration = parseDuration(userInput);
  const parsedAnglers = parseAnglers(userInput);
  const parsedSpecies = parseSpecies(userInput);

  if (parsedDate && !next.date) next.date = parsedDate;
  if (parsedDuration && !next.duration) next.duration = parsedDuration;
  if (parsedAnglers && !next.anglers) next.anglers = parsedAnglers;
  // species can legitimately be null (user said "anything"), only update if
  // the user actually mentioned species keywords
  if (parsedSpecies && !next.species) next.species = parsedSpecies;

  // ── Determine bot response based on step + what we now know ────────────

  let botContent = '';
  let tripResults: ScheduledTrip[] | undefined;
  let nextStep: ConversationStep = next.step;

  // --- Booking intent ---
  if (wantsBooking(userInput)) {
    botContent =
      "To book a trip, head to the landing's website directly:\n\n" +
      "• **Seaforth Sportfishing**: seaforthlandingsportfishing.com\n" +
      "• **Fisherman's Landing**: fishermanslanding.com\n\n" +
      "Both sites let you book online and pay a deposit. Is there anything else I can help you figure out?";
    nextStep = 'followup';
  }

  // --- Wants more options ---
  else if (nextStep === 'followup' && wantsMoreOptions(userInput)) {
    // Re-run the search with relaxed or no filters
    const results = filterTrips({
      date: next.date ?? undefined,
      anglers: next.anglers ?? undefined,
    });
    tripResults = results;
    botContent = buildRecommendationMessage(results, next);
    nextStep = 'followup';
  }

  // --- Follow-up on existing recommendations ---
  else if (nextStep === 'recommend' || nextStep === 'followup') {
    if (isNegative(userInput) || wantsMoreOptions(userInput)) {
      // Clear a filter based on context and re-recommend
      if (parsedDate || parsedDuration || parsedAnglers || parsedSpecies) {
        // They gave new criteria — re-search
        const results = filterTrips({
          date: next.date ?? undefined,
          duration: next.duration ?? undefined,
          anglers: next.anglers ?? undefined,
          species: next.species ?? undefined,
        });
        tripResults = results;
        botContent = buildRecommendationMessage(results, next);
        nextStep = 'followup';
      } else {
        botContent =
          "No problem! What would you like to change — the date, trip length, group size, or target species?";
        nextStep = 'followup';
      }
    } else if (parsedDate || parsedDuration || parsedAnglers || parsedSpecies) {
      // They refined the search
      const results = filterTrips({
        date: next.date ?? undefined,
        duration: next.duration ?? undefined,
        anglers: next.anglers ?? undefined,
        species: next.species ?? undefined,
      });
      tripResults = results;
      botContent = buildRecommendationMessage(results, next);
      nextStep = 'followup';
    } else {
      botContent =
        "Happy to help more! Are you looking to change dates, adjust trip length, or do you want info on how to book?";
      nextStep = 'followup';
    }
  }

  // --- Main conversation flow ---
  else {
    // We now have enough to recommend if we have at least a date
    const readyToRecommend = !!next.date;

    if (readyToRecommend) {
      const results = filterTrips({
        date: next.date ?? undefined,
        duration: next.duration ?? undefined,
        anglers: next.anglers ?? undefined,
        species: next.species ?? undefined,
      });
      tripResults = results;
      botContent = buildRecommendationMessage(results, next);
      nextStep = 'recommend';
    } else if (next.step === 'greeting') {
      // First response — we either got a date or we ask for one
      if (!next.date) {
        botContent = pickDatePrompt();
        nextStep = 'ask_date';
      } else {
        // Got date but no duration — ask duration
        botContent = pickDurationPrompt(next.date);
        nextStep = 'ask_duration';
      }
    } else if (next.step === 'ask_date') {
      if (!next.date) {
        botContent =
          "I didn't quite catch that date — can you try again? You can say something like \"Friday\", \"April 5th\", or \"this weekend\".";
        nextStep = 'ask_date';
      } else if (!next.duration) {
        botContent = pickDurationPrompt(next.date);
        nextStep = 'ask_duration';
      } else {
        // Both date and duration known — recommend
        const results = filterTrips({
          date: next.date,
          duration: next.duration ?? undefined,
          anglers: next.anglers ?? undefined,
          species: next.species ?? undefined,
        });
        tripResults = results;
        botContent = buildRecommendationMessage(results, next);
        nextStep = 'recommend';
      }
    } else if (next.step === 'ask_duration') {
      if (!next.duration) {
        botContent =
          "Got it! What kind of trip length works for you? Options include half day, 3/4 day, full day, overnight, or a multi-day adventure.";
        nextStep = 'ask_duration';
      } else {
        const results = filterTrips({
          date: next.date ?? undefined,
          duration: next.duration,
          anglers: next.anglers ?? undefined,
          species: next.species ?? undefined,
        });
        tripResults = results;
        botContent = buildRecommendationMessage(results, next);
        nextStep = 'recommend';
      }
    } else {
      // Catch-all — show what we have
      const results = filterTrips({
        date: next.date ?? undefined,
        duration: next.duration ?? undefined,
        anglers: next.anglers ?? undefined,
        species: next.species ?? undefined,
      });
      if (results.length > 0) {
        tripResults = results;
        botContent = buildRecommendationMessage(results, next);
        nextStep = 'recommend';
      } else {
        botContent = pickDatePrompt();
        nextStep = 'ask_date';
      }
    }
  }

  const botMsg: ChatMessage = {
    role: 'bot',
    content: botContent,
    timestamp: Date.now() + 1,
    tripResults,
  };

  next.step = nextStep;
  next.messages = [...next.messages, botMsg];

  return next;
}

// ---------------------------------------------------------------------------
// Prompt helpers — variety prevents the bot feeling repetitive
// ---------------------------------------------------------------------------

function pickDatePrompt(): string {
  const options = [
    "When were you thinking of heading out? You can say something like \"this Friday\", \"April 5th\", or \"next weekend\".",
    "What date works for you? I can check availability for any day this week.",
    "Let's start with a date — are you thinking this weekend, or do you have a specific day in mind?",
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function pickDurationPrompt(date: string): string {
  // Format the date nicely for the response
  const d = new Date(date + 'T12:00:00'); // noon to avoid DST edge cases
  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const options = [
    `Nice — ${formatted} it is. How long a trip are you looking for? Half day, 3/4 day, full day, overnight, or something longer like a 2-day or 3-day?`,
    `${formatted} sounds like a great day on the water. What trip length works for you — quick half-day or going all out with a full day or overnight?`,
    `Got ${formatted} locked in! Are you thinking a quick half-day out, a full-day offshore run, or maybe an overnight to really chase some fish?`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}
