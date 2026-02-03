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
    price: 105,
    perks: [
      "Access to /fly command",
      "/kit stranger daily",
      "Custom name prefix",
      "5 home slots",
      "Priority queue access"
    ],
    color: "from-cyan-400 to-teal-600",
    duration: "30 Days",
    command: "Stranger"
  },
  {
    id: "mythic",
    name: "Mythic",
    price: 175,
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
    command: "Mythic"
  },
  {
    id: "amethyst",
    name: "Amethyst",
    price: 250,
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
    command: "Amethyst"
  }
];

export const crates: Crate[] = [
  {
    id: "keyall-crate",
    name: "Keyall Crate",
    price: 90,
    description: "A bundle of random keys for all crate types on the server",
    color: "from-cyan-500 to-blue-500",
    command: "keall_crate",
  },
  {
    id: "money-crate",
    name: "Money Crate",
    price: 120,
    description: "Guaranteed in-game currency rewards ranging from 100K to 10M",
    color: "from-green-500 to-emerald-600",
    command: "Moneycrate",
  },
  {
    id: "astro-crate",
    name: "Astro Crate",
    price: 150,
    description: "Cosmic rewards with rare enchants, gear and exclusive cosmetics",
    color: "from-indigo-500 to-blue-700",
    command: "astro_crate",
  },
  {
    id: "moon-crate",
    name: "Moon Crate",
    price: 180,
    description: "Ultimate tier rewards including legendary gear and rare materials",
    color: "from-slate-300 to-slate-500",
    command: "Moon_crate",
  },
];


export const moneyPackages: MoneyPackage[] = [
  { id: "1m", amount: "1M", amountInt: 1000000, price: 50 },
  { id: "5m", amount: "5M", amountInt: 5000000, price: 150 },
  { id: "10m", amount: "10M", amountInt: 10000000, price: 250 },
  { id: "50m", amount: "50M", amountInt: 50000000, price: 400 },
  { id: "100m", amount: "100M", amountInt: 100000000, price: 600 },
  { id: "1b", amount: "1B", amountInt: 1000000000, price: 900 },
  { id: "10b", amount: "10B", amountInt: 10000000000, price: 1500 },
  { id: "100b", amount: "100B", amountInt: 100000000000, price: 2500 }
];

export const formatPrice = (price: number) => `₹${price}`;
