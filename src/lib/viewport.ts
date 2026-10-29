import { useSyncExternalStore } from "react";
const query = "(max-width: 680px)";
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
export const useCompactViewport = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
