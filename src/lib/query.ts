import { QueryClient } from "@tanstack/react-query";
import { errorData } from "./api";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15000,
      retry: (count, error) =>
        count < 1 &&
        ["UNAVAILABLE", "NETWORK", "ERR_NETWORK"].includes(
          errorData(error).code,
        ),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});
