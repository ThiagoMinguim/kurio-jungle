import { useQueries } from "@tanstack/react-query";
import { useFavorites } from "./data";
import { get } from "../lib/api";
import type { Nft } from "../domain/types";
import { Empty, ErrorBox, NftCard, Skeleton } from "../components/shared";
export function Favorites() {
  const favorites = useFavorites(),
    queries = useQueries({
      queries: (favorites.data || []).map((id) => ({
        queryKey: ["nft", id],
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          get<Nft>(`/nfts/${id}`, signal),
      })),
    });
  return (
    <>
      <span className="eyebrow">SUA SELEÇÃO PESSOAL</span>
      <h1>
        Obras favoritas<span className="accent">.</span>
      </h1>
      <ErrorBox
        error={favorites.error}
        retry={() => void favorites.refetch()}
      />
      {favorites.isPending ? (
        <Skeleton count={3} />
      ) : favorites.data?.length ? (
        <div className="nft-grid">
          {queries.map((q, i) =>
            q.data ? (
              <NftCard nft={q.data} key={q.data.id} />
            ) : (
              <div key={i}>
                <Skeleton />
                <ErrorBox error={q.error} />
              </div>
            ),
          )}
        </div>
      ) : (
        <Empty title="Salve o que inspira você">
          <p>Use o coração em uma obra para encontrá-la aqui depois.</p>
        </Empty>
      )}
    </>
  );
}
