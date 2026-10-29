export type Eth = string;
export type Edition = {
  id: string;
  name: string;
  stock: number;
  price: Eth;
  label?: string;
};
export type NftReview = {
  id: string;
  author: string;
  rating: number;
  text: string;
};
export type Nft = {
  id: string;
  name: string;
  creator: string;
  category: string;
  network: string;
  image: string;
  description: string;
  editions: Edition[];
  version: number;
  collection?: string;
  attributes?: string[];
  reviews?: NftReview[];
  gallery?: string[];
  popularity?: number;
  compareAtPrice?: Eth;
  badge?: string;
};
export type CatalogSearch = {
  q: string;
  category: string;
  network: string;
  sort: string;
  page: number;
  min: string;
  max: string;
};
export type Catalog = {
  items: Nft[];
  total: number;
  pages: number;
  page: number;
  facets?: {
    categories: Record<string, number>;
    networks: Record<string, number>;
  };
};
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  username?: string;
  ensName?: string;
  ensSuffix?: string;
  walletAlias?: string;
};
export type Session = { user: User; token: string; expiresAt: number };
export type CartItem = { nftId: string; editionId: string; quantity: number };
export type Cart = { items: CartItem[]; version: number };
export type QuoteLine = CartItem & {
  name: string;
  edition: string;
  image: string;
  price: Eth;
  total: Eth;
  nftVersion: number;
};
export type Quote = {
  id: string;
  lines: QuoteLine[];
  coupon: string;
  subtotal: Eth;
  discount: Eth;
  fee: Eth;
  total: Eth;
  fingerprint: string;
  expiresAt: number;
};
export type Wallet = {
  id: string;
  name: string;
  address: string;
  network: string;
  primary: boolean;
  displayName?: string;
  profileName?: string;
  secondaryAddress?: string;
  provider?: string;
  referralCode?: string;
  email?: string;
  ensName?: string;
  ensSuffix?: string;
};
export const walletProviders = [
  "WalletConnect",
  "MetaMask",
  "Coinbase Wallet",
] as const;
export type CollectorDetails = {
  username: string;
  profileName: string;
  secondaryAddress: string;
  referralCode: string;
  ensSuffix: string;
  notes: string;
  provider: (typeof walletProviders)[number];
};
export type Order = {
  id: string;
  userId: string;
  version: number;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  createdAt: number;
  settleAt: number;
  decline: boolean;
  transaction: string;
  collector: { name: string; email: string };
  wallet: Wallet;
  details?: CollectorDetails;
};
export type Attempt = {
  key: string;
  quoteId: string;
  name: string;
  email: string;
  walletId: string;
  network: string;
  details?: CollectorDetails;
};
export type ApiError = {
  message: string;
  code: string;
  fields?: Record<string, string>;
  quote?: Quote;
};
export type DomainEvent = {
  eventId: string;
  resourceId: string;
  version: number;
  sessionToken?: string;
  type: "nft.updated" | "order.updated";
};
export const networks = ["Ethereum", "Polygon", "Solana"] as const;
export const categories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
] as const;
