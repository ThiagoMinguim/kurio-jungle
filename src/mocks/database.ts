import {
  categories,
  networks,
  type Nft,
  type User,
  type Wallet,
  type Cart,
  type Order,
  type Quote,
  type Session,
} from "../domain/types";
import { isNft } from "../domain/contracts";
export const scenarioNames = [
  "success",
  "empty",
  "slow",
  "out-of-order",
  "offline",
  "http-500",
  "expired-session",
  "favorite-failure",
  "payment-declined",
  "order-timeout",
  "pending",
  "price-change",
  "sold-out",
  "validation",
  "wallet-refused",
  "wallet-disconnected",
] as const;
export type Scenario = (typeof scenarioNames)[number];
type Account = User & {
  passwordHash: string;
  salt: string;
  wallets: Wallet[];
  favorites: string[];
};
export type Database = {
  schema: number;
  scenario: Scenario;
  nfts: Nft[];
  accounts: Account[];
  sessions: Session[];
  carts: Record<string, Cart>;
  quotes: Record<string, Quote>;
  orders: Record<string, Order>;
  attempts: Record<string, { signature: string; orderId: string }>;
  next: number;
};
const KEY = "kurio.mock.database.v1";
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function seed(): Promise<Database> {
  const names = ["Emerald Ape", "Sage Nomad", "Ivory Baron", "Golden Beat"];
  const arts = ["emerald", "sage", "ivory", "golden"];
  const referenceNfts = [
    { name: "Emerald Ape #042", art: "emerald", price: "1.19" },
    { name: "Sage Nomad #009", art: "sage", price: "1.69" },
    { name: "Neon Vessel #552", art: "ivory", price: "1.99" },
    { name: "Cosmic Bloom #118", art: "sage", price: "1.29" },
    { name: "Violet Nomad #314", art: "sage", price: "1.39" },
    { name: "Ivory Baron #088", art: "ivory", price: "1.79" },
    { name: "Golden Beat #207", art: "golden", price: "0.99" },
    { name: "Golden Frequency #071", art: "golden", price: "0.99" },
    { name: "Golden Signal #160", art: "golden", price: "0.39" },
  ];
  const accounts: Account[] = [];
  for (const [i, name] of ["Thiago Demo", "Bia Demo"].entries()) {
    const salt = `kurio-demo-${i}`;
    accounts.push({
      id: `user-${i + 1}`,
      name,
      email: `${i ? "bia" : "thiago"}@demo.test`,
      avatar: `/art/${arts[i]}.webp`,
      salt,
      passwordHash: await passwordHash("Demo123!", salt),
      wallets: [
        {
          id: `wallet-${i}`,
          name: "Carteira principal",
          address: `0x${String(i + 1).repeat(40)}`,
          network: "Ethereum",
          primary: true,
        },
      ],
      favorites: [],
    });
  }
  return {
    schema: 1,
    scenario: "success",
    nfts: Array.from({ length: 24 }, (_, i) => ({
      id: `nft-${i + 1}`,
      name:
        referenceNfts[i]?.name ||
        `${names[i % 4]} #${String(42 + i * 17).padStart(3, "0")}`,
      ...(i === 2 ? { compareAtPrice: "2.29", badge: "RARO" } : {}),
      creator: ["Studio Kurio", "Mila Santos", "Nico Arts"][i % 3],
      category: categories[i % categories.length],
      network: networks[i % 3],
      image: `/art/${referenceNfts[i]?.art || arts[i % 4]}.webp`,
      description:
        "Uma expressão única de identidade digital. Arte cuidadosamente criada para uma nova geração de colecionadores. Esta peça e toda a experiência de compra são fictícias.",
      editions: [
        {
          id: "original",
          name: "Original",
          price:
            referenceNfts[i]?.price || ["1.19", "1.09", "1.99", "0.99"][i % 4],
          stock: i === 5 ? 12 : 8,
        },
        {
          id: "limited",
          name: "Edição limitada",
          price: "2.29",
          stock: i === 0 ? 0 : 3,
        },
      ],
      version: 1,
    })),
    accounts,
    sessions: [],
    carts: {},
    quotes: {},
    orders: {},
    attempts: {},
    next: 1,
  };
}
export let db: Database;
/** Add catalog presentation data without resetting sessions, carts or receipts. */
function enrichNft(nft: Nft) {
  // Malformed records remain untouched so the HTTP contract reports the error.
  if (!isNft(nft)) return;
  nft.popularity ??=
    100 -
    (Array.from(nft.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      100);
  nft.collection ||= "Kurio Apes";
  nft.attributes ||=
    nft.id === "nft-1"
      ? ["Óculos", "Esmeralda", "Raro"]
      : ["Retrato", "Colecionável", "Original"];
  nft.reviews ||= Array.from({ length: 19 }, (_, index) => ({
    id: `${nft.id}-review-${index + 1}`,
    author: ["Lia Costa", "Rafa Lima", "Caio Reis", "Bia Alves"][index % 4],
    rating: index % 5 === 4 ? 4 : 5,
    text: [
      "Gostei da combinação de cores e dos detalhes da obra.",
      "Uma peça marcante para a coleção.",
      "Boa experiência para explorar arte digital.",
    ][index % 3],
  }));
  const labels: Record<string, string> = {
    original: "1/50",
    limited: "1/10",
    unique: "1/1",
    open: "ABERTA",
  };
  for (const edition of nft.editions)
    edition.label ||= labels[edition.id] || edition.name;
  if (!nft.editions.some((edition) => edition.id === "unique"))
    nft.editions.push({
      id: "unique",
      name: "Edição única",
      label: "1/1",
      stock: 1,
      price: "3.99",
    });
  if (!nft.editions.some((edition) => edition.id === "open"))
    nft.editions.push({
      id: "open",
      name: "Edição aberta",
      label: "ABERTA",
      stock: 100,
      price: "0.99",
    });
}
export function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}
export async function initializeDatabase() {
  try {
    db = JSON.parse(localStorage.getItem(KEY) || "null") as Database;
    if (db?.schema !== 1) throw new Error("seed");
  } catch {
    db = await seed();
    save();
  }
  // Rename only the original demo identity, keeping IDs, passwords and purchases.
  const primary = db.accounts.find((account) => account.id === "user-1");
  if (
    primary?.email === "alex@demo.test" &&
    !db.accounts.some((account) => account.email === "thiago@demo.test")
  ) {
    primary.email = "thiago@demo.test";
    if (primary.name === "Alex Demo") primary.name = "Thiago Demo";
    for (const session of db.sessions)
      if (session.user.id === primary.id) session.user = publicUser(primary);
  }
  for (const nft of db.nfts) enrichNft(nft);
  save();
}
export async function resetDatabase(scenario: Scenario = "success") {
  db = await seed();
  for (const nft of db.nfts) enrichNft(nft);
  db.scenario = scenario;
  save();
}
export function publicUser(account: Account): User {
  const { id, name, email, avatar } = account;
  return {
    id,
    name,
    email,
    avatar,
    username:
      account.username ||
      name
        .toLowerCase()
        .replace(/\s+/g, ".")
        .replace(/[^\p{L}\p{N}_.-]/gu, "")
        .slice(0, 40),
    ensName: account.ensName || "",
    ensSuffix: account.ensSuffix || ".eth",
    walletAlias: account.walletAlias || "",
  };
}
