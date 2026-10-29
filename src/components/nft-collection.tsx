import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { get } from "../lib/api";
import type { Catalog } from "../domain/types";
import { eth } from "../domain/money";
import { ErrorBox } from "./shared";
export function RelatedNfts({
  nftId,
  title = "Mais desta coleção",
}: {
  nftId: string;
  title?: string;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["catalog", "related", nftId, page],
    queryFn: ({ signal }) =>
      get<Catalog>(
        `/nfts?page=${page}&sort=featured&relatedTo=${encodeURIComponent(nftId)}`,
        signal,
      ),
  });
  const items = query.data?.items
    .filter((item) => item.id !== nftId)
    .slice(0, 5);
  return (
    <section className="nft-related" aria-label={title}>
      <h2>{title}</h2>
      <ErrorBox error={query.error} retry={() => void query.refetch()} />
      <div className="nft-related-grid">
        {query.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <div className="skeleton" key={i} />
            ))
          : items?.map((item) => (
              <Link to="/nft/$nftId" params={{ nftId: item.id }} key={item.id}>
                <div>
                  <img
                    src={item.image}
                    alt={item.name}
                    width="196"
                    height="196"
                    loading="lazy"
                  />
                </div>
                <h3>{item.name}</h3>
                <strong>{eth(item.editions[0].price)}</strong>
              </Link>
            ))}
      </div>
      {query.data && (
        <nav className="nft-related-pagination" aria-label="Páginas da coleção">
          {Array.from({ length: query.data.pages }, (_, i) => (
            <button
              key={i}
              aria-label={`Página ${i + 1} da coleção`}
              aria-current={page === i + 1 ? "page" : undefined}
              onClick={() => setPage(i + 1)}
            />
          ))}
        </nav>
      )}
    </section>
  );
}
