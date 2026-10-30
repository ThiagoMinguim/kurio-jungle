import { Scenarios } from "./scenarios";
import { lazy, Suspense, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { SlidersHorizontal, Search } from "lucide-react";
import { useCompactViewport } from "../lib/viewport";
import { CommerceFooter } from "../components/commerce-footer";
import { MarketContent } from "./market-content";
import "./catalog.css";
import { get } from "../lib/api";
import {
  categories,
  networks,
  type Catalog as CatalogData,
  type CatalogSearch,
  type Nft,
} from "../domain/types";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Empty,
  ErrorBox,
  NftCard,
  Select,
  Skeleton,
} from "../components/shared";
const PriceRange = lazy(() =>
  import("../components/price-range").then((module) => ({
    default: module.PriceRange,
  })),
);
const desktopQuery = "(min-width: 961px)";
const subscribeDesktop = (listener: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
export function Catalog() {
  const mobile = useCompactViewport();
  const [heroIndex, setHeroIndex] = useState(0);
  const featuredId = ["nft-1", "nft-2", "nft-3"][heroIndex];
  const showDesktopFilters = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
  );
  const search = useSearch({ strict: false }) as CatalogSearch,
    navigate = useNavigate();
  const query = useQuery({
    queryKey: ["catalog", search],
    queryFn: ({ signal }) =>
      get<CatalogData>(
        `/nfts?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}`,
        signal,
      ),
  });
  const featured = useQuery({
    queryKey: ["nft", featuredId],
    queryFn: ({ signal }) => get<Nft>(`/nfts/${featuredId}`, signal),
  });
  const update = (values: Partial<CatalogSearch>) =>
    void navigate({
      to: "/",
      search: (prev: CatalogSearch) => ({
        ...prev,
        ...values,
        page: values.page ?? 1,
      }),
      resetScroll: false,
    });
  const filters = (suffix: string) => (
    <>
      <div className="filter-title">
        Coleções
        <button
          className="filter-clear"
          onClick={() => update({ category: "" })}
        >
          Todas
        </button>
      </div>
      {categories.map((c) => (
        <button
          key={c}
          className={
            search.category === c ? "filter-link active" : "filter-link"
          }
          onClick={() => update({ category: search.category === c ? "" : c })}
        >
          <span>{c}</span>
          <span>({query.data?.facets?.categories[c] ?? 0})</span>
        </button>
      ))}
      <Suspense
        fallback={
          <div
            className="price-filter-loading"
            role="status"
            aria-label="Carregando faixa de preço"
          />
        }
      >
        <PriceRange
          key={`${suffix}-${search.min}-${search.max}`}
          min={search.min}
          max={search.max}
          suffix={suffix}
          onApply={update}
        />
      </Suspense>
      <div className="network-filter">
        <Select
          label="Rede"
          id={`network-filter-${suffix}`}
          value={search.network}
          onChange={(e) => update({ network: e.target.value })}
        >
          <option value="">Todas as redes</option>
          {networks.map((network) => (
            <option key={network}>{network}</option>
          ))}
        </Select>
        {suffix === "desktop" && (
          <div className="network-options">
            {networks.map((network) => (
              <button
                key={network}
                aria-pressed={search.network === network}
                onClick={() =>
                  update({ network: search.network === network ? "" : network })
                }
              >
                <span>{network}</span>
                <span>({query.data?.facets?.networks[network] ?? 0})</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {suffix === "mobile" && (
        <Select
          label="Ordenar por"
          id="sort-filter-mobile"
          value={search.sort}
          onChange={(event) => update({ sort: event.target.value })}
        >
          <option value="featured">Em destaque</option>
          <option value="trending">Em alta</option>
          <option value="newest">Mais recentes</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </Select>
      )}
      <Button
        variant="ghost"
        onClick={() =>
          update({
            q: "",
            category: "",
            network: "",
            min: "",
            max: "",
            sort: "featured",
          })
        }
      >
        Limpar filtros
      </Button>
    </>
  );
  return (
    <>
      {mobile && (
        <div className="catalog-mobile-top">
          <div className="search-input">
            <Search size={20} aria-hidden="true" />
            <input
              aria-label="Buscar NFTs"
              placeholder="Explorar coleções"
              value={search.q}
              onChange={(event) => update({ q: event.target.value })}
            />
          </div>
        </div>
      )}
      <section className="hero">
        <div>
          <span className="eyebrow hero-welcome">Bem-vindo à Kurio</span>
          <h1>
            <span className="hero-desktop-title">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </span>
            <span className="hero-mobile-title">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </span>
          </h1>
          <p className="hero-desktop-copy">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <p className="hero-mobile-copy">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a href="#catalogo" className="hero-cta">
            EXPLORAR
          </a>
        </div>
        <div className="featured-frame">
          <ErrorBox
            error={featured.error}
            retry={() => void featured.refetch()}
          />
          {featured.data ? (
            <Link
              to="/nft/$nftId"
              params={{ nftId: featured.data.id }}
              className="hero-art"
            >
              <img
                src={featured.data.image}
                srcSet={
                  featured.data.image === "/art/emerald.webp"
                    ? "/art/emerald-640.webp 640w, /art/emerald.webp 900w"
                    : undefined
                }
                sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1250px) 40vw, 450px"
                alt={`Retrato de ${featured.data.name}`}
                width="640"
                height="640"
                fetchPriority="high"
              />
            </Link>
          ) : (
            !featured.error && <Skeleton />
          )}
          <img
            className="hero-miniature"
            src="/art/sage.webp"
            alt=""
            width="60"
            height="60"
          />
        </div>
        <div className="hero-pagination" aria-label="Destaques">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              aria-label={`Destaque ${index + 1}`}
              aria-pressed={heroIndex === index}
              onClick={() => setHeroIndex(index)}
            />
          ))}
        </div>
      </section>
      <section
        className="catalog-section"
        id="catalogo"
        aria-labelledby="catalog-title"
      >
        <h2 id="catalog-title" className="sr-only">
          Mercado de NFTs
        </h2>
        <div className="catalog-layout">
          <aside
            className="filter-panel desktop-filters"
            aria-label="Filtros do catálogo"
          >
            {showDesktopFilters ? (
              <>
                {filters("desktop")}
                <Link
                  className="sidebar-feature"
                  to="/nft/$nftId"
                  params={{ nftId: "nft-2" }}
                >
                  <h3>NFT EM DESTAQUE</h3>
                  <strong>OFERTA LIMITADA</strong>
                  <img
                    src="/art/sage.webp"
                    alt="Sage Nomad"
                    width="310"
                    height="360"
                    loading="lazy"
                  />
                </Link>
              </>
            ) : null}
          </aside>
          <div>
            <div className="catalog-toolbar">
              <div className="catalog-tabs">
                <button
                  className={
                    !search.sort || search.sort === "featured"
                      ? "catalog-tab active"
                      : "catalog-tab"
                  }
                  onClick={() => update({ sort: "featured" })}
                >
                  Todos os NFTs
                  <span className="sr-only"> ({query.data?.total ?? "—"})</span>
                </button>
                <button
                  className={
                    search.sort === "newest"
                      ? "catalog-tab active"
                      : "catalog-tab"
                  }
                  onClick={() => update({ sort: "newest" })}
                >
                  Novos lançamentos
                </button>
                <button
                  className={
                    search.sort === "trending"
                      ? "catalog-tab active"
                      : "catalog-tab"
                  }
                  onClick={() => update({ sort: "trending" })}
                >
                  Em alta
                </button>
              </div>
              <Select
                label="Ordenar por"
                id="sort"
                value={search.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="featured">Em destaque</option>
                <option value="trending">Em alta</option>
                <option value="newest">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </Select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mobile-filters">
                    <SlidersHorizontal size={16} />
                    <span>Filtros</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Filtrar obras</DialogTitle>
                  <DialogDescription>
                    Combine coleção, rede e preço.
                  </DialogDescription>
                  <div className="filter-panel">{filters("mobile")}</div>
                </DialogContent>
              </Dialog>
            </div>
            {query.isFetching && !query.isPending && (
              <p role="status" className="muted">
                Atualizando catálogo…
              </p>
            )}
            <ErrorBox error={query.error} retry={() => void query.refetch()} />
            {query.isPending ? (
              <Skeleton count={6} />
            ) : query.data?.items.length ? (
              <>
                <div className="nft-grid">
                  {query.data.items.map((n, i) => (
                    <NftCard key={n.id} nft={n} priority={i < 3} />
                  ))}
                </div>
                <nav className="pagination" aria-label="Paginação">
                  {Array.from({ length: query.data.pages }, (_, i) => (
                    <Button
                      key={i}
                      variant={search.page === i + 1 ? "default" : "ghost"}
                      aria-current={search.page === i + 1 ? "page" : undefined}
                      onClick={() => update({ page: i + 1 })}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </nav>
              </>
            ) : (
              !query.error && (
                <Empty title="Nenhuma obra encontrada">
                  <p>Experimente outra combinação de filtros.</p>
                  <Button
                    onClick={() =>
                      update({
                        q: "",
                        category: "",
                        network: "",
                        min: "",
                        max: "",
                      })
                    }
                  >
                    Limpar busca
                  </Button>
                </Empty>
              )
            )}
          </div>
        </div>
      </section>
      <MarketContent />
      <CommerceFooter />
      {mobile && (
        <div className="mobile-laboratory">
          <Link to="/demo" className="demo-footer-link">
            Guia da demonstração
          </Link>
          <Scenarios />
        </div>
      )}
    </>
  );
}
