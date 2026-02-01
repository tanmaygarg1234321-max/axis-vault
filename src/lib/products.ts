export interface Rank {
  id: string;
  name: string;
  price: number;
  perks: string[];
  color: string;
  duration: string;
  command: string;
}

export interface Crate {
  id: string;
  name: string;
  price: number;
  description: string;
  color: string;
  command: string;
}

export interface MoneyPackage {
  id: string;
  amount: string;
  amountInt: number;
  price: number;
}

export const ranks: Rank[] = [
  {
    id: "stranger",
    name: "Stranger",
    price: 69,
    perks: [
      "Access to /fly command",
      "/kit stranger daily",
      "Custom name prefix",
      "5 home slots",
      "Priority queue access"
    ],
    color: "from-cyan-400 to-teal-600",
    duration: "30 Days",
    command: "stranger"
  },
  {
    id: "mythic",
    name: "Mythic",
    price: 120,
    perks: [
      "All Stranger perks",
      "/kit mythic daily",
      "Purple name prefix",
      "10 home slots",
      "/heal command",
      "Colored chat messages"
    ],
    color: "from-purple-500 to-violet-600",
    duration: "30 Days",
    command: "mythic"
  },
  {
    id: "amethyst",
    name: "Amethyst",
    price: 167,
    perks: [
      "All Mythic perks",
      "/kit amethyst daily",
      "Amethyst name prefix",
      "Unlimited homes",
      "/enderchest anywhere",
      "/workbench anywhere",
      "VIP Discord role",
      "Priority support"
    ],
    color: "from-amber-400 to-orange-600",
    duration: "30 Days",
    command: "amethyst"
  }
];

export const crates: Crate[] = [
  {
    id: "keyall-crate",
    name: "Keyall Crate",
    price: 10,
    description: "A bundle of random keys for all crate types on the server",
    color: "from-cyan-500 to-blue-500",
    command: "keyall",
  },
  {
    id: "money-crate",
    name: "Money Crate",
    price: 20,
    description: "Guaranteed in-game currency rewards ranging from 100K to 10M",
    color: "from-green-500 to-emerald-600",
    command: "money",
  },
  {
    id: "astro-crate",
    name: "Astro Crate",
    price: 35,
    description: "Cosmic rewards with rare enchants, gear and exclusive cosmetics",
    color: "from-indigo-500 to-blue-700",
    command: "astro",
  },
  {
    id: "moon-crate",
    name: "Moon Crate",
    price: 40,
    description: "Ultimate tier rewards including legendary gear and rare materials",
    color: "from-slate-300 to-slate-500",
    command: "moon",
  },
];


export const moneyPackages: MoneyPackage[] = [
  { id: "1m", amount: "1M", amountInt: 1000000, price: 32 },
  { id: "5m", amount: "5M", amountInt: 5000000, price: 105 },
  { id: "10m", amount: "10M", amountInt: 10000000, price: 155 },
  { id: "50m", amount: "50M", amountInt: 50000000, price: 210 },
  { id: "100m", amount: "100M", amountInt: 100000000, price: 315 },
  { id: "1b", amount: "1B", amountInt: 1000000000, price: 520 },
  { id: "10b", amount: "10B", amountInt: 10000000000, price: 830 },
  { id: "100b", amount: "100B", amountInt: 100000000000, price: 1040 }
];

export const formatPrice = (price: number) => `₹${price}`;
