import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/session";
import { api, get, post } from "../lib/api";
import type { Cart, CartItem, User, Wallet } from "../domain/types";
export function useCart() {
  const { session, ready } = useAuth();
  return useQuery({
    queryKey: ["cart", session?.token || "guest"],
    queryFn: ({ signal }) => get<Cart>("/cart", signal),
    enabled: ready,
  });
}
export function useCartMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      method,
    }: {
      item: CartItem;
      method: "add" | "set" | "remove";
    }) =>
      method === "remove"
        ? (
            await api.delete<Cart>(
              `/cart?nftId=${item.nftId}&editionId=${item.editionId}`,
            )
          ).data
        : (
            await api.request<Cart>({
              url: "/cart",
              method: method === "add" ? "POST" : "PUT",
              data: item,
            })
          ).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["cart"] }),
  });
}
export function useFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["private", session?.token, "favorites"],
    queryFn: ({ signal }) => get<string[]>("/favorites", signal),
    enabled: !!session,
  });
}
export function useFavoriteMutation() {
  const { session } = useAuth(),
    client = useQueryClient(),
    key = ["private", session?.token, "favorites"];
  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      post<string[]>("/favorites", { nftId, favorite }),
    onMutate: async ({ nftId, favorite }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key);
      client.setQueryData<string[]>(key, (old) =>
        favorite
          ? [...new Set([...(old || []), nftId])]
          : (old || []).filter((id) => id !== nftId),
      );
      return { previous };
    },
    onError: (_error, _args, context) =>
      client.setQueryData(key, context?.previous),
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
export function useProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["private", session?.token, "profile"],
    queryFn: ({ signal }) => get<User>("/profile", signal),
    enabled: !!session,
  });
}
export function useWallets() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["private", session?.token, "wallets"],
    queryFn: ({ signal }) => get<Wallet[]>("/wallets", signal),
    enabled: !!session,
  });
}
