import { RelatedNfts } from "../components/nft-collection";
import { CommerceFooter } from "../components/commerce-footer";
import { useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Mail,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Star,
} from "lucide-react";
import { QuantityField } from "../components/quantity";
import { quantityError } from "../domain/validation";
import { get } from "../lib/api";
import type { Nft } from "../domain/types";
import { eth } from "../domain/money";
import { Button } from "../components/ui/button";
import { Empty, ErrorBox, Favorite } from "../components/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import { useCartMutation } from "./data";
import "./detail.css";
const compactQuery = "(max-width: 680px)";
const compactViewport = () => window.matchMedia(compactQuery).matches;
const subscribeViewport = (listener: () => void) => {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
export function Detail() {
  const { nftId } = useParams({ strict: false });
  const query = useQuery({
    queryKey: ["nft", nftId],
    queryFn: ({ signal }) => get<Nft>(`/nfts/${nftId}`, signal),
  });
  return (
    <>
      <nav className="nft-breadcrumb" aria-label="Localização">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to="/" hash="catalogo">
          Mercado
        </Link>
      </nav>
      {query.isPending ? (
        <div
          role="status"
          aria-label="Carregando conteúdo"
          className="nft-focus-loading"
        >
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : query.error ? (
        <>
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
          <Empty title="Não conseguimos abrir esta obra" />
        </>
      ) : (
        query.data && <DetailContent key={query.data.id} nft={query.data} />
      )}
    </>
  );
}
function ReviewList({ nft }: { nft: Nft }) {
  return (
    <div className="nft-review-list">
      {nft.reviews?.length ? (
        nft.reviews.map((review) => (
          <article key={review.id}>
            <div>
              <strong>{review.author}</strong>
              <span aria-label={`${review.rating} de 5 estrelas`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < review.rating ? "currentColor" : "none"}
                  />
                ))}
              </span>
            </div>
            <p>{review.text}</p>
          </article>
        ))
      ) : (
        <p>Esta obra ainda não tem avaliações.</p>
      )}
    </div>
  );
}
function DetailContent({ nft }: { nft: Nft }) {
  const [editionId, setEdition] = useState(nft.editions[0].id),
    [quantity, setQuantity] = useState("1"),
    [variant, setVariant] = useState(0),
    [added, setAdded] = useState(false),
    [zoom, setZoom] = useState(false),
    [reviewsOpen, setReviewsOpen] = useState(false),
    [tab, setTab] = useState<"details" | "reviews">("details"),
    [shareNotice, setShareNotice] = useState("");
  const mobile = useSyncExternalStore(
      subscribeViewport,
      compactViewport,
      () => false,
    ),
    tabs = useRef<HTMLElement>(null),
    mutation = useCartMutation(),
    navigate = useNavigate();
  const edition = nft.editions.find((item) => item.id === editionId)!,
    error = quantityError(quantity, edition.stock);
  const gallery = nft.gallery?.length
      ? nft.gallery
      : Array.from({ length: 4 }, () => nft.image),
    image = gallery[variant] || nft.image;
  const token = (nft.name.match(/#(\d+)/)?.[1] || nft.id).padStart(4, "0"),
    reviews = nft.reviews || [],
    average = reviews.length
      ? (
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        ).toFixed(1)
      : "—";
  const orderedEditions = [...nft.editions].sort(
    (a, b) =>
      ["unique", "limited", "original", "open"].indexOf(a.id) -
      ["unique", "limited", "original", "open"].indexOf(b.id),
  );
  async function add(buy = false) {
    if (error) return;
    try {
      await mutation.mutateAsync({
        item: { nftId: nft.id, editionId, quantity: Number(quantity) },
        method: "add",
      });
      setAdded(true);
      if (buy) void navigate({ to: "/cart" });
    } catch {
      /* Shown by ErrorBox. */
    }
  }
  function changeQuantity(delta: number) {
    setQuantity(
      String(
        Math.max(1, Math.min(edition.stock, Number(quantity || 0) + delta)),
      ),
    );
    setAdded(false);
  }
  function showReviews() {
    if (mobile) setReviewsOpen(true);
    else {
      setTab("reviews");
      tabs.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setShareNotice("Link copiado.");
    } catch {
      setShareNotice(
        "Não foi possível copiar. Copie o endereço na barra do navegador.",
      );
    }
  }
  return (
    <>
      <section
        className="nft-focus-grid"
        aria-label={`Detalhes de ${nft.name}`}
      >
        <div className="nft-gallery">
          <div className="nft-gallery-actions">
            <Link to="/" aria-label="Voltar para as obras">
              <ArrowLeft size={18} />
            </Link>
            {mobile && <Favorite nft={nft} />}
          </div>
          <div className="nft-thumbnails" aria-label="Galeria da obra">
            {gallery.map((src, index) => (
              <button
                key={index}
                aria-label={`Imagem ${index + 1}`}
                aria-pressed={variant === index}
                onClick={() => setVariant(index)}
              >
                <img
                  src={src}
                  alt=""
                  width="100"
                  height="100"
                  style={{
                    objectPosition:
                      index === 1
                        ? "44% 50%"
                        : index === 2
                          ? "58% 50%"
                          : "50% 50%",
                    transform: `scale(${[1, 1.06, 1.12, 1.22][index] ?? 1})`,
                  }}
                />
              </button>
            ))}
          </div>
          <div className="nft-active-frame">
            <div className="nft-art-crop">
              <img
                className="detail-art"
                data-variant={variant + 1}
                src={image}
                srcSet={
                  image === "/art/emerald.webp"
                    ? "/art/emerald-640.webp 640w, /art/emerald.webp 900w"
                    : undefined
                }
                sizes="(max-width: 680px) calc(100vw - 56px), 404px"
                width="404"
                height="404"
                alt={`Galeria de ${nft.name}`}
                style={{
                  transform: `scale(${[1, 1.06, 1.12, 1.22][variant] ?? 1})`,
                  objectPosition:
                    variant === 1
                      ? "44% 50%"
                      : variant === 2
                        ? "58% 50%"
                        : "50% 50%",
                }}
              />
            </div>
            <button
              className="nft-zoom"
              aria-label="Ampliar imagem do NFT"
              onClick={() => setZoom(true)}
            >
              <Search size={24} />
            </button>
          </div>
        </div>
        <div className="nft-info">
          <div className="nft-name-row">
            <h1>{nft.name}</h1>
            {mobile && (
              <button
                className="nft-rating-pill"
                onClick={showReviews}
                aria-label={`Ver ${reviews.length} avaliações, nota ${average}`}
              >
                <Star size={14} fill="currentColor" />
                {average}({reviews.length})
              </button>
            )}
          </div>
          <div className="nft-price-rating">
            <strong>{eth(edition.price)}</strong>
            <button onClick={showReviews}>
              <span className="nft-stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </span>
              <span>{reviews.length} avaliações de colecionadores</span>
            </button>
          </div>
          <div className="nft-description">
            <h2>Sobre este NFT:</h2>
            <p className="nft-desktop-description">{nft.description}</p>
            <p className="nft-mobile-description">
              Um colecionável digital {edition.label || edition.name} da coleção
              Kurio Editions, apresentado na rede {nft.network} nesta
              demonstração.
            </p>
          </div>
          <fieldset className="nft-editions">
            <legend>Edição:</legend>
            <div role="radiogroup" aria-label="Edição">
              {orderedEditions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  role="radio"
                  id={`edition-${option.id}`}
                  tabIndex={editionId === option.id ? 0 : -1}
                  aria-checked={editionId === option.id}
                  aria-label={`${option.label || option.name}: ${option.name}${option.stock === 0 ? ", esgotada" : ""}`}
                  title={`${option.name} — ${option.stock} disponíveis`}
                  disabled={mutation.isPending}
                  onKeyDown={(event) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                        "Home",
                        "End",
                      ].includes(event.key)
                    ) {
                      event.preventDefault();
                      const index = orderedEditions.findIndex(
                        (item) => item.id === option.id,
                      );
                      const nextIndex =
                        event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? orderedEditions.length - 1
                            : (index +
                                (["ArrowLeft", "ArrowUp"].includes(event.key)
                                  ? -1
                                  : 1) +
                                orderedEditions.length) %
                              orderedEditions.length;
                      const next = orderedEditions[nextIndex];
                      setEdition(next.id);
                      setQuantity("1");
                      setAdded(false);
                      document.getElementById(`edition-${next.id}`)?.focus();
                    }
                  }}
                  onClick={() => {
                    setEdition(option.id);
                    setQuantity("1");
                    setAdded(false);
                  }}
                >
                  {option.label || option.name}
                </button>
              ))}
            </div>
          </fieldset>
          {edition.stock === 0 && (
            <p role="status" className="availability-note">
              Esta edição está esgotada. Escolha outra edição.
            </p>
          )}
          <dl className="nft-properties">
            <div>
              <dt>ID do token:</dt>
              <dd>#{token}</dd>
            </div>
            <div>
              <dt>Coleção:</dt>
              <dd>{nft.collection || "Kurio Apes"}</dd>
            </div>
            <div>
              <dt>Atributos:</dt>
              <dd>
                {(nft.attributes || ["Original", "Colecionável"]).join(", ")}
              </dd>
            </div>
          </dl>
          <div className="nft-purchase">
            <div
              className={`nft-quantity-price ${error && edition.stock > 0 ? "has-error" : ""}`}
            >
              <span className="nft-quantity-caption">Qtd.</span>
              <div className="nft-stepper">
                <button
                  aria-label="Diminuir quantidade"
                  disabled={
                    mutation.isPending ||
                    edition.stock === 0 ||
                    Number(quantity) <= 1
                  }
                  onClick={() => changeQuantity(-1)}
                >
                  <Minus size={19} />
                </button>
                <QuantityField
                  label="Quantidade"
                  id="quantity"
                  value={quantity}
                  disabled={edition.stock === 0 || mutation.isPending}
                  error={edition.stock > 0 ? error : undefined}
                  onValueChange={(value) => {
                    setQuantity(value);
                    setAdded(false);
                  }}
                />
                <button
                  aria-label="Aumentar quantidade"
                  disabled={
                    mutation.isPending ||
                    edition.stock === 0 ||
                    Number(quantity) >= edition.stock
                  }
                  onClick={() => changeQuantity(1)}
                >
                  <Plus size={19} />
                </button>
              </div>
              <strong className="nft-mobile-price">{eth(edition.price)}</strong>
            </div>
            <div className="nft-actions">
              <Button
                disabled={mutation.isPending || !!error}
                onClick={() => void add(true)}
              >
                {mobile ? "Comprar NFT" : "COMPRAR"}
              </Button>
              {!mobile && <Favorite nft={nft} labeled />}
              <Button
                className="nft-cart-action"
                variant="outline"
                aria-label="Adicionar ao carrinho"
                disabled={mutation.isPending || !!error}
                onClick={() => void add()}
              >
                <ShoppingCart size={21} />
              </Button>
            </div>
            <ErrorBox error={mutation.error} />
            {added && (
              <p role="status" className="success">
                Adicionado ao carrinho. <Link to="/cart">Ver carrinho →</Link>
              </p>
            )}
          </div>
          <div className="nft-sharing">
            <strong>Compartilhar este NFT:</strong>
            <a
              aria-label="Compartilhar no LinkedIn"
              target="_blank"
              rel="noreferrer"
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(location.href)}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 14 14"
                width="14"
                height="14"
                fill="currentColor"
              >
                <circle cx="1.5" cy="1.5" r="1.5" />
                <path d="M0 5h3v9H0zM5 5h3v1c1-2 6-2 6 3v5h-3V9c0-2-3-2-3 0v5H5z" />
              </svg>
            </a>
            <a
              aria-label="Compartilhar por e-mail"
              href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(location.href)}`}
            >
              <Mail size={16} />
            </a>
            <button
              aria-label="Copiar link do NFT"
              onClick={() => void copyLink()}
            >
              {shareNotice === "Link copiado." ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          {shareNotice && (
            <p role="status" className="nft-share-notice">
              {shareNotice}
            </p>
          )}
        </div>
      </section>
      {!mobile && (
        <>
          <section className="nft-information-tabs" ref={tabs}>
            <div role="tablist" aria-label="Informações do NFT">
              {(["details", "reviews"] as const).map((value, index) => (
                <button
                  key={value}
                  id={`nft-tab-${value}`}
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls={`nft-panel-${value}`}
                  tabIndex={tab === value ? 0 : -1}
                  onClick={() => setTab(value)}
                  onKeyDown={(event) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    ) {
                      event.preventDefault();
                      const next =
                        event.key === "Home"
                          ? "details"
                          : event.key === "End"
                            ? "reviews"
                            : index === 0
                              ? "reviews"
                              : "details";
                      setTab(next);
                      document.getElementById(`nft-tab-${next}`)?.focus();
                    }
                  }}
                >
                  {value === "details"
                    ? "Detalhes do NFT"
                    : `Avaliações de colecionadores (${reviews.length})`}
                </button>
              ))}
            </div>
            <div
              id="nft-panel-details"
              role="tabpanel"
              aria-labelledby="nft-tab-details"
              hidden={tab !== "details"}
            >
              <p>
                {nft.name} é uma obra digital da coleção{" "}
                {nft.collection || "Kurio Apes"}. {nft.description}
              </p>
              <p>
                Conheça os atributos e escolha uma edição disponível. A compra
                demonstrativa registra um recibo com os itens, valores e
                carteira selecionados.
              </p>
              <dl>
                <div>
                  <dt>Rede:</dt>
                  <dd>
                    {nft.network}. Os dados e a disponibilidade pertencem ao
                    ambiente de demonstração.
                  </dd>
                </div>
                <div>
                  <dt>Contrato:</dt>
                  <dd>
                    Referência ilustrativa de metadados. Não há contrato
                    blockchain real associado à compra.
                  </dd>
                </div>
                <div>
                  <dt>Criador:</dt>
                  <dd>{nft.creator}. Arte da coleção de referência.</dd>
                </div>
              </dl>
            </div>
            <div
              id="nft-panel-reviews"
              role="tabpanel"
              aria-labelledby="nft-tab-reviews"
              hidden={tab !== "reviews"}
            >
              <ReviewList nft={nft} />
            </div>
          </section>
          <RelatedNfts nftId={nft.id} />
          <CommerceFooter />
        </>
      )}
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="nft-zoom-dialog">
          <DialogTitle>{nft.name}</DialogTitle>
          <DialogDescription>
            Visualização ampliada da obra selecionada.
          </DialogDescription>
          <img src={image} alt={nft.name} width="900" height="900" />
        </DialogContent>
      </Dialog>
      <Dialog open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <DialogContent className="nft-reviews-dialog">
          <DialogTitle>Avaliações de colecionadores</DialogTitle>
          <DialogDescription>
            {reviews.length} avaliações da coleção demonstrativa.
          </DialogDescription>
          <ReviewList nft={nft} />
        </DialogContent>
      </Dialog>
    </>
  );
}
