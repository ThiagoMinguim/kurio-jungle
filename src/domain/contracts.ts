import type { Catalog, Nft } from "./types";
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const integer = (value: unknown, minimum: number) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
export function isNft(value: unknown): value is Nft {
  if (!record(value)) return false;
  return (
    [
      "id",
      "name",
      "creator",
      "category",
      "network",
      "image",
      "description",
    ].every((key) => typeof value[key] === "string") &&
    !!value.id &&
    !!value.name &&
    !!value.image &&
    (value.compareAtPrice === undefined ||
      (typeof value.compareAtPrice === "string" &&
        /^\d+(\.\d{1,18})?$/.test(value.compareAtPrice))) &&
    (value.badge === undefined || typeof value.badge === "string") &&
    (value.popularity === undefined || integer(value.popularity, 0)) &&
    (value.collection === undefined || typeof value.collection === "string") &&
    (value.attributes === undefined ||
      (Array.isArray(value.attributes) &&
        value.attributes.every((item) => typeof item === "string"))) &&
    (value.gallery === undefined ||
      (Array.isArray(value.gallery) &&
        value.gallery.length > 0 &&
        value.gallery.every((item) => typeof item === "string"))) &&
    (value.reviews === undefined ||
      (Array.isArray(value.reviews) &&
        value.reviews.every(
          (review) =>
            record(review) &&
            typeof review.id === "string" &&
            typeof review.author === "string" &&
            typeof review.text === "string" &&
            integer(review.rating, 1) &&
            Number(review.rating) <= 5,
        ))) &&
    integer(value.version, 1) &&
    Array.isArray(value.editions) &&
    value.editions.length > 0 &&
    value.editions.every(
      (edition) =>
        record(edition) &&
        typeof edition.id === "string" &&
        !!edition.id &&
        typeof edition.name === "string" &&
        typeof edition.price === "string" &&
        /^\d+(\.\d{1,18})?$/.test(edition.price) &&
        integer(edition.stock, 0),
    ) &&
    new Set(value.editions.map((edition) => edition.id)).size ===
      value.editions.length
  );
}
const countsRecord = (value: unknown) =>
  record(value) && Object.values(value).every((count) => integer(count, 0));
const facetsRecord = (value: unknown) =>
  record(value) &&
  countsRecord(value.categories) &&
  countsRecord(value.networks);
export function isCatalog(value: unknown): value is Catalog {
  return (
    record(value) &&
    Array.isArray(value.items) &&
    value.items.every(isNft) &&
    (value.facets === undefined || facetsRecord(value.facets)) &&
    integer(value.total, 0) &&
    integer(value.pages, 1) &&
    integer(value.page, 1)
  );
}
export class InvalidResponseError extends Error {
  constructor(
    resource: string,
    public code = "INVALID_RESPONSE",
    message?: string,
  ) {
    super(
      message ||
        `Não foi possível carregar ${resource}: a resposta veio incompleta. Tente novamente ou recarregue a página.`,
    );
    this.name = "InvalidResponseError";
  }
}
