// Demo content for the designs. Shapes follow backend/src/types.ts so screens can be wired
// to the API later without changing their props.

export type BodyColor = 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'teal' | 'yellow' | 'pink';
export type Accessory = 'thermos' | 'backpack' | 'chef hat' | 'headphones' | 'none';
export type Mood = 'calm' | 'excited' | 'happy' | 'cool';
export type Pose = 'standing' | 'waving' | 'thinking' | 'jumping' | 'leaning';

export interface CharacterSpec {
  color: BodyColor;
  accessory: Accessory;
  mood: Mood;
  pose: Pose;
  title: string;
  tagline: string;
}

export interface Friend {
  id: string;
  name: string;
  city: string;
  vibe: string;
  describe: string;
  character: CharacterSpec;
}

export const BODY_COLORS: Record<BodyColor, string> = {
  blue: '#5AAEEA',
  orange: '#FF9442',
  green: '#4FC07A',
  purple: '#9C7BE3',
  red: '#F2665C',
  teal: '#36C2B4',
  yellow: '#FFD84D',
  pink: '#F58CC4',
};

export const CAST: Friend[] = [
  {
    id: 'arlo', name: 'Arlo', city: 'Seattle', vibe: 'Fresh air',
    describe: 'Steady and reliable, always the one with a map and a thermos of coffee.',
    character: { color: 'blue', accessory: 'thermos', mood: 'calm', pose: 'leaning', title: 'the navigator', tagline: 'Brings the map, the coffee and the patience.' },
  },
  {
    id: 'beck', name: 'Beck', city: 'Austin', vibe: 'Something new',
    describe: "Up for anything. Will hike, climb or road trip on a moment's notice.",
    character: { color: 'orange', accessory: 'backpack', mood: 'excited', pose: 'waving', title: 'the adventurer', tagline: 'Already packed. Just tell Beck which way.' },
  },
  {
    id: 'cyrus', name: 'Cyrus', city: 'Chicago', vibe: 'Eating well',
    describe: 'Lives for good food. Has opinions about every restaurant in town.',
    character: { color: 'green', accessory: 'chef hat', mood: 'happy', pose: 'jumping', title: 'the foodie', tagline: 'Has a dinner reservation in every city. Probably.' },
  },
  {
    id: 'dante', name: 'Dante', city: 'Atlanta', vibe: 'Slow and cozy',
    describe: 'Quiet, thoughtful, loves music and a good playlist.',
    character: { color: 'purple', accessory: 'headphones', mood: 'cool', pose: 'thinking', title: 'the DJ', tagline: 'The road trip playlist is already four hours long.' },
  },
];

export const ME = CAST[1];
export const friend = (id: string): Friend => CAST.find((f) => f.id === id) ?? CAST[0];

export const GROUP = { name: 'The Long Weekenders', code: 'K7M2QX' };

export const VIBES = ['Slow and cozy', 'Something new', 'Eating well', 'Out late', 'Fresh air'];

// Upcoming Saturdays from Oct 24, 2026. `free` lists who marked that weekend.
export interface Weekend { iso: string; label: string; free: string[] }
export const WEEKENDS: Weekend[] = [
  { iso: '2026-10-31', label: 'Oct 31', free: ['arlo', 'dante'] },
  { iso: '2026-11-07', label: 'Nov 7', free: ['beck', 'cyrus', 'dante'] },
  { iso: '2026-11-14', label: 'Nov 14', free: ['arlo', 'beck'] },
  { iso: '2026-11-21', label: 'Nov 21', free: ['arlo', 'beck', 'cyrus', 'dante'] },
  { iso: '2026-11-28', label: 'Nov 28', free: ['cyrus'] },
  { iso: '2026-12-05', label: 'Dec 5', free: ['arlo', 'beck', 'cyrus', 'dante'] },
  { iso: '2026-12-12', label: 'Dec 12', free: ['arlo', 'beck', 'dante'] },
  { iso: '2026-12-19', label: 'Dec 19', free: ['beck', 'cyrus'] },
  { iso: '2026-12-26', label: 'Dec 26', free: [] },
  { iso: '2027-01-02', label: 'Jan 2', free: ['arlo', 'beck', 'cyrus', 'dante'] },
  { iso: '2027-01-09', label: 'Jan 9', free: ['arlo', 'cyrus', 'dante'] },
  { iso: '2027-01-16', label: 'Jan 16', free: ['beck', 'dante'] },
];
export const MY_WEEKENDS = WEEKENDS.filter((w) => w.free.includes(ME.id)).map((w) => w.iso);

export interface Plan {
  id: string;
  city: string;
  weekend: string;
  dates: string;
  nights: number;
  longestTrip: string;
  longestWho: string;
  costPp: number;
  survival: number;
}

export const PLANS: Plan[] = [
  { id: 'den-1121', city: 'Denver', weekend: '2026-11-21', dates: 'Nov 21 to 23', nights: 2, longestTrip: '6h 50m', longestWho: 'Dante', costPp: 340, survival: 52 },
  { id: 'kc-1121', city: 'Kansas City', weekend: '2026-11-21', dates: 'Nov 21 to 23', nights: 2, longestTrip: '7h 20m', longestWho: 'Arlo', costPp: 290, survival: 49 },
  { id: 'nsh-1205', city: 'Nashville', weekend: '2026-12-05', dates: 'Dec 5 to 7', nights: 2, longestTrip: '7h 40m', longestWho: 'Arlo', costPp: 310, survival: 44 },
  { id: 'stl-0102', city: 'St. Louis', weekend: '2027-01-02', dates: 'Jan 2 to 4', nights: 2, longestTrip: '7h 55m', longestWho: 'Arlo', costPp: 270, survival: 41 },
];

export interface Smaller { id: string; text: string; city: string; nights: number; dates: string; survival: number; delta: number; why: string }
export const SMALLER: Smaller[] = [
  { id: 'kc-1n', text: '1 night in Kansas City', city: 'Kansas City', nights: 1, dates: 'Nov 21 to 22', survival: 61, delta: 9, why: 'Cheapest option and one less night to clear.' },
  { id: 'den-1n', text: '1 night in Denver', city: 'Denver', nights: 1, dates: 'Nov 21 to 22', survival: 58, delta: 6, why: 'Same city, half the hotel bill.' },
  { id: 'den-dec', text: 'Denver on Dec 5 instead', city: 'Denver', nights: 2, dates: 'Dec 5 to 7', survival: 56, delta: 4, why: 'Two more weeks to book flights.' },
];

export const PACT_PLAN = {
  city: 'Kansas City', dates: 'Sat Nov 21 to Sun Nov 22, 2026', nights: 1, longestTrip: '6h 40m', longestWho: 'Arlo', costPp: 230, survival: 61,
};

export const EXPLORER_URL = 'https://explorer.solana.com/tx/4mZp8kQ2vR1demo?cluster=devnet';

export interface FeedEntry { at: string; from?: string; system?: boolean; text: string }
export const FEED: FeedEntry[] = [
  { at: '9:12 AM', system: true, text: 'Dante joined Base Camp.' },
  { at: '9:40 AM', from: 'cyrus', text: 'If we end up in Kansas City I am booking the barbecue place. Non-negotiable.' },
  { at: '10:05 AM', from: 'arlo', text: 'I can do Nov 21 or Jan 2. Flights from Seattle are cheaper for Nov 21.' },
  { at: '10:18 AM', system: true, text: 'Scout the Route found 4 plans. Best bet: Denver, Nov 21.' },
  { at: '10:31 AM', from: 'beck', text: 'One night in KC is 61%. I say we lock it in.' },
];

export const NUDGES = [
  { id: 'n1', text: 'Dante has not marked weekends in December yet. A quick tap would firm up 3 plans.' },
  { id: 'n2', text: 'Flights to Kansas City for Nov 21 usually go up about 3 weeks out. Sign by Oct 31 to be safe.' },
];

// 14 seeded daily readings + today's live score, in percent.
export const HISTORY = [
  { day: 'Oct 10', v: 33, demo: true }, { day: 'Oct 11', v: 35, demo: true }, { day: 'Oct 12', v: 34, demo: true },
  { day: 'Oct 13', v: 38, demo: true }, { day: 'Oct 14', v: 41, demo: true }, { day: 'Oct 15', v: 40, demo: true },
  { day: 'Oct 16', v: 44, demo: true }, { day: 'Oct 17', v: 43, demo: true }, { day: 'Oct 18', v: 47, demo: true },
  { day: 'Oct 19', v: 50, demo: true }, { day: 'Oct 20', v: 49, demo: true }, { day: 'Oct 21', v: 52, demo: true },
  { day: 'Oct 22', v: 54, demo: true }, { day: 'Oct 23', v: 52, demo: false }, { day: 'Oct 24', v: 61, demo: false },
];

export const oddsLabel = (p: number): string =>
  p >= 75 ? 'Looking great' : p >= 60 ? 'Likely to happen' : p >= 45 ? 'Could go either way' : p >= 30 ? 'Needs work' : 'Unlikely as planned';
