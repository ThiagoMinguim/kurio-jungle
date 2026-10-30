import type { SearchMiddleware } from "@tanstack/react-router";
import { categories, networks, type CatalogSearch } from "../domain/types";

export const catalogDefaults: CatalogSearch = {
  q: "",
  category: "",
  network: "",
  sort: "featured",
  page: 1,
  min: "",
  max: "",
};
export function catalogSearch(input: Record<string, unknown>): CatalogSearch {
  const page = Number(input.page);
  const price = (value: unknown) =>
    /^\d+(\.\d{1,18})?$/.test(String(value)) ? String(value) : "";
  return {
    q: typeof input.q === "string" ? input.q.slice(0, 100) : "",
    category: categories.includes(input.category as never)
      ? String(input.category)
      : "",
    network: networks.includes(input.network as never)
      ? String(input.network)
      : "",
    sort: [
      "featured",
      "newest",
      "price-asc",
      "price-desc",
      "trending",
    ].includes(String(input.sort))
      ? String(input.sort)
      : "featured",
    page:
      Number.isSafeInteger(Math.floor(page)) && page >= 1
        ? Math.floor(page)
        : 1,
    min: price(input.min),
    max: price(input.max),
  };
}
export function compactCatalogSearch(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(catalogSearch(input)).filter(
      ([key, value]) => value !== catalogDefaults[key as keyof CatalogSearch],
    ),
  );
}

// A return destination is one internal URL, not a chain of login destinations.
export function internalDestination(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    Array.from(value).some(
      (character) =>
        character === "\\" ||
        character.charCodeAt(0) <= 32 ||
        character.charCodeAt(0) === 127,
    ) ||
    /%0[ad]/i.test(value)
  )
    return undefined;
  try {
    const url = new URL(value, "https://kurio.invalid");
    if (
      url.origin !== "https://kurio.invalid" ||
      url.pathname.startsWith("//") ||
      /%2f|%5c/i.test(url.pathname) ||
      /^\/(?:login|register)(?:\/|$)/i.test(url.pathname)
    )
      return undefined;
    const params = new URLSearchParams(
      Object.entries(
        compactCatalogSearch(Object.fromEntries(url.searchParams)),
      ).map(([key, item]) => [key, String(item)]),
    );
    if (
      url.pathname === "/wallets" &&
      url.searchParams.get("returnTo") === "/checkout"
    )
      params.set("returnTo", "/checkout");
    const query = params.toString();
    return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
  } catch {
    return undefined;
  }
}
export function flowSearch(
  path: string,
): SearchMiddleware<
  CatalogSearch & { next: string | undefined; returnTo: string | undefined }
> {
  return ({ search, next }) => {
    const result = { ...next(search) };
    if (!["/login", "/register"].includes(path)) result.next = undefined;
    if (path !== "/wallets") result.returnTo = undefined;
    return result;
  };
}
export function dismissLogin(next: string, search: Record<string, unknown>) {
  const target = internalDestination(next);
  if (target) {
    const path = new URL(target, "https://kurio.invalid").pathname;
    if (path === "/" || path === "/demo" || path.startsWith("/nft/"))
      return target;
  }
  const query = new URLSearchParams(
    Object.entries(compactCatalogSearch(search)).map(([key, value]) => [
      key,
      String(value),
    ]),
  ).toString();
  return query ? `/?${query}` : "/";
}
