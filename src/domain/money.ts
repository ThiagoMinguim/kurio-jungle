import type { Eth } from "./types";
const SCALE = 10n ** 18n;
/** Decimal ETH <-> integer wei, never passing monetary values through Number. */
export function toWei(value: Eth): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error("Valor ETH inválido");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(18, "0"));
}
export function fromWei(value: bigint): Eth {
  if (value < 0n) throw new Error("Valor negativo");
  const fraction = (value % SCALE)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${value / SCALE}${fraction ? `.${fraction}` : ""}`;
}
export function eth(value: Eth): string {
  return `${value} ETH`;
}
export function sameCartItem(
  a: { nftId: string; editionId: string },
  b: { nftId: string; editionId: string },
) {
  return a.nftId === b.nftId && a.editionId === b.editionId;
}
