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
    id: "warden",
    name: "Warden",
    price: 105,
    perks: [
      "Access to /fly command",
      "/kit warden daily",
      "Green name prefix",
      "5 home slots",
      "Priority queue access"
    ],
    color: "from-emerald-500 to-emerald-600",
    duration: "30 Days",
    command: "warden"
  },
  {
    id: "revenant",
    name: "Revenant",
    price: 165,
    perks: [
      "All Warden perks",
      "/kit revenant daily",
      "Blue name prefix",
      "10 home slots",
      "/heal command (30m cooldown)",
      "Colored chat messages"
    ],
    color: "from-blue-500 to-cyan-500",
    duration: "30 Days",
    command: "revenant"
  },
  {
    id: "mythic",
    name: "Mythic",
    price: 210,
    perks: [
      "All Revenant perks",
      "/kit mythic daily",
      "Purple name prefix",
      "15 home slots",
      "/feed command",
      "Custom join messages"
    ],
    color: "from-purple-500 to-violet-600",
    duration: "30 Days",
    command: "mythic"
  },
  {
    id: "void",
    name: "Void",
    price: 310,
    perks: [
      "All Mythic perks",
      "/kit void daily",
      "Dark purple prefix",
      "20 home slots",
      "/enderchest anywhere",
      "/workbench anywhere",
      "Pet access"
    ],
    color: "from-indigo-600 to-purple-800",
    duration: "30 Days",
    command: "void"
  },
  {
    id: "astix",
    name: "Astix",
    price: 520,
    perks: [
      "All Void perks",
      "/kit astix daily",
      "Golden animated prefix",
      "Unlimited homes",
      "/nick command",
      "Exclusive cosmetics",
      "VIP Discord role",
      "Priority support"
    ],
    color: "from-yellow-400 to-amber-600",
    duration: "30 Days",
    command: "astix"
  }
];

export const crates: Crate[] = [
  {
    id: "astix-crate",
    name: "Astix Crate",
    price: 210,
    description:
      "Ultimate tier rewards including legendary gear, rare enchants, and exclusive cosmetics",
    color: "from-yellow-400 to-amber-600",
    command: "astix",
  },
  {
    id: "void-crate",
    name: "Void Crate",
    price: 155,
    description: "High-tier loot with powerful enchantments and rare materials",
    color: "from-indigo-600 to-purple-800",
    command: "void",
  },
  {
    id: "mythic-crate",
    name: "Mythic Crate",
    price: 95,
    description: "Mid-tier rewards with rare enchants, gear and cosmetics",
    color: "from-purple-500 to-violet-600",
    command: "mythic",
  },
  {
    id: "spawner-crate",
    name: "Spawner Crate",
    price: 365,
    description:
      "Random spawner drops including rare mob types and custom spawners",
    color: "from-red-500 to-orange-600",
    command: "spawner",
  },
  {
    id: "money-crate",
    name: "Money Crate",
    price: 465,
    description: "Guaranteed in-game currency rewards ranging from 100K to 10M",
    color: "from-green-500 to-emerald-600",
    command: "money",
  },
  {
    id: "keyall-crate",
    name: "Keyall Crate",
    price: 90,
    description: "A bundle of random keys for all crate types on the server",
    color: "from-cyan-500 to-blue-500",
    command: "keyall",
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
