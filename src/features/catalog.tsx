import { lazy, Suspense, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch, Link } from "@tanstack/react-router";
import { ArrowRight, SlidersHorizontal, Search } from "lucide-react";
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
    queryKey: ["nft", "nft-1"],
    queryFn: ({ signal }) => get<Nft>("/nfts/nft-1", signal),
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
      <div className="filter-title">Coleções</div>
      <button
        className={!search.category ? "filter-link active" : "filter-link"}
        onClick={() => update({ category: "" })}
      >
        Todas as coleções
      </button>
      {categories.map((c) => (
        <button
          key={c}
          className={
            search.category === c ? "filter-link active" : "filter-link"
          }
          onClick={() => update({ category: search.category === c ? "" : c })}
        >
          {c}
        </button>
      ))}
      <hr />
      <Select
        label="Rede"
        id={`network-filter-${suffix}`}
        value={search.network}
        onChange={(e) => update({ network: e.target.value })}
      >
        <option value="">Todas as redes</option>
        {networks.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </Select>
      <hr />
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
      <section className="hero">
        <div>
          <span className="eyebrow hero-welcome">Bem-vindo à Kurio</span>
          <h1>
            SEJA DONO DO FUTURO
            <br className="desktop-only" /> DA ARTE DIGITAL
          </h1>
          <p>
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
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
            {showDesktopFilters ? filters("desktop") : null}
          </aside>
          <div>
            <div className="catalog-toolbar">
              <span className="catalog-tab">
                Todos os NFTs <small>({query.data?.total ?? "—"})</small>
              </span>
              <div className="search-input">
                <Search size={16} aria-hidden="true" />
                <input
                  aria-label="Buscar NFTs"
                  placeholder="Busque uma obra ou criador"
                  value={search.q}
                  onChange={(e) => update({ q: e.target.value })}
                />
              </div>
              <Select
                label="Ordenar por"
                id="sort"
                value={search.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="featured">Em destaque</option>
                <option value="newest">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </Select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mobile-filters">
                    <SlidersHorizontal size={16} />
                    Filtros
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
      <section className="collection-banner">
        <img
          src="/art/sage.webp"
          width="240"
          height="240"
          loading="lazy"
          alt="Sage Nomad, coleção de arte digital"
        />
        <div>
          <span className="eyebrow">ARTE QUE CONTA HISTÓRIAS</span>
          <h2>
            Peças únicas.
            <br />
            Novas perspectivas.
          </h2>
          <p>Conheça os originais da comunidade Kurio.</p>
          <Link
            to="/"
            search={{ category: "Colecionáveis" }}
            className="text-link"
          >
            Explorar colecionáveis <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
