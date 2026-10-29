import { CartQuantity } from "../components/quantity";
import { useEffect, useState } from "react";
import { Tooltip } from "../components/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Trash2, ArrowRight } from "lucide-react";
import { errorData, get, post } from "../lib/api";
import type { CartItem, Nft, Quote } from "../domain/types";
import { RelatedNfts } from "../components/nft-collection";
import { CommerceFooter } from "../components/commerce-footer";
import { ArrowLeft } from "lucide-react";
import "./cart.css";
import { eth, fromWei, toWei } from "../domain/money";
import { useAuth } from "../app/session";
import { Button } from "../components/ui/button";
import { Empty, ErrorBox, Field, Skeleton } from "../components/shared";
import { useCart, useCartMutation } from "./data";
export function couponKey(userId?: string) {
  return `kurio.coupon.${userId || "guest"}`;
}
export function Summary({ quote }: { quote: Quote }) {
  return (
    <dl className="summary-lines">
      <div>
        <dt>Subtotal</dt>
        <dd>{eth(quote.subtotal)}</dd>
      </div>
      <div>
        <dt>Desconto{quote.coupon ? ` (${quote.coupon})` : ""}</dt>
        <dd>− {eth(quote.discount)}</dd>
      </div>
      <div>
        <dt>Taxa de rede simulada</dt>
        <dd>{eth(quote.fee)}</dd>
      </div>
      <div className="summary-total">
        <dt>Total</dt>
        <dd data-testid="quote-total">{eth(quote.total)}</dd>
      </div>
    </dl>
  );
}
function CartLine({ item }: { item: CartItem }) {
  const nft = useQuery({
      queryKey: ["nft", item.nftId],
      queryFn: ({ signal }) => get<Nft>(`/nfts/${item.nftId}`, signal),
    }),
    mutation = useCartMutation();
  const edition = nft.data?.editions.find((e) => e.id === item.editionId);
  if (!nft.data || !edition)
    return (
      <article className="cart-unavailable">
        {nft.isPending ? (
          <Skeleton />
        ) : (
          <>
            <h2>{nft.data?.name || "Obra indisponível"}</h2>
            <p role="alert">
              Esta obra ou edição não está disponível. Remova este item para
              continuar.
            </p>
            <ErrorBox error={nft.error} retry={() => void nft.refetch()} />
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ item, method: "remove" })}
            >
              Remover item indisponível
            </Button>
          </>
        )}
      </article>
    );
  return (
    <article className="cart-line">
      <Link
        className="cart-line-art"
        to="/nft/$nftId"
        params={{ nftId: item.nftId }}
      >
        <img
          src={nft.data.image}
          alt={nft.data.name}
          width="112"
          height="112"
        />
      </Link>
      <div className="cart-line-info">
        <Link to="/nft/$nftId" params={{ nftId: item.nftId }}>
          <h2>{nft.data.name}</h2>
        </Link>
        <p>
          <span className="cart-token">
            ID do token: #{nft.data.name.split("#")[1]}
          </span>
          <span className="cart-edition">
            Edição: {edition.label || edition.name}
          </span>
        </p>
        <strong className="cart-mobile-price">
          {eth(fromWei(toWei(edition.price) * BigInt(item.quantity)))}
        </strong>
        {item.quantity > edition.stock && (
          <p role="alert">
            Quantidade superior ao estoque atual ({edition.stock}). Ajuste ou
            remova.
          </p>
        )}
      </div>
      <strong className="cart-unit-price">{eth(edition.price)}</strong>
      <div className="cart-line-actions">
        <CartQuantity
          controls
          label={`Quantidade de ${nft.data.name}`}
          id={`qty-${item.nftId}-${item.editionId}`}
          quantity={item.quantity}
          stock={edition.stock}
          key={`${item.quantity}-${edition.stock}`}
          disabled={mutation.isPending}
          onCommit={(quantity) =>
            mutation.mutate({ item: { ...item, quantity }, method: "set" })
          }
        />
      </div>
      <strong className="cart-line-total">
        {eth(fromWei(toWei(edition.price) * BigInt(item.quantity)))}
      </strong>
      <Tooltip label={`Remover ${nft.data.name}`}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remover ${nft.data.name}`}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate({ item, method: "remove" })}
        >
          <Trash2 size={18} />
        </Button>
      </Tooltip>
      <ErrorBox error={mutation.error} />
    </article>
  );
}
export function CartPage() {
  const { session } = useAuth();
  return <CartContent key={session?.token || "guest"} />;
}
function CartContent() {
  const cart = useCart(),
    { session } = useAuth(),
    [coupon, setCoupon] = useState(
      () => localStorage.getItem(couponKey(session?.user.id)) || "",
    ),
    [draft, setDraft] = useState(coupon),
    [rejected, setRejected] = useState<{
      code: string;
      message: string;
    } | null>(null),
    client = useQueryClient(),
    ownerToken = session?.token || "guest",
    quote = useQuery({
      queryKey: [
        "private",
        session?.token || "guest",
        "quote",
        cart.data?.version,
        coupon,
      ],
      queryFn: () => post<Quote>("/quote", { coupon }),
      enabled: !!cart.data?.items.length,
      retry: false,
    }),
    applyCoupon = useMutation({
      mutationFn: ({ code }: { code: string; version: number }) =>
        post<Quote>("/quote", { coupon: code }),
      onSuccess: (value, variables) => {
        if ((localStorage.getItem("kurio.session") || "guest") !== ownerToken)
          return;
        client.setQueryData(
          ["private", ownerToken, "quote", variables.version, variables.code],
          value,
        );
        setCoupon(variables.code);
        setRejected(null);
        if (variables.code)
          localStorage.setItem(couponKey(session?.user.id), variables.code);
        else localStorage.removeItem(couponKey(session?.user.id));
      },
    });
  useEffect(() => {
    if (
      coupon &&
      quote.error &&
      errorData(quote.error).code === "INVALID_COUPON"
    ) {
      setRejected({ code: coupon, message: errorData(quote.error).message });
      setCoupon("");
      localStorage.removeItem(couponKey(session?.user.id));
    }
  }, [coupon, quote.error, session?.user.id]);
  const couponFailure =
    applyCoupon.error && errorData(applyCoupon.error).code === "INVALID_COUPON"
      ? errorData(applyCoupon.error).message
      : rejected?.code === draft.trim().toUpperCase()
        ? rejected.message
        : undefined;
  return (
    <>
      <nav className="cart-breadcrumb" aria-label="Localização">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to="/" hash="catalogo">
          Mercado
        </Link>
        <span>/ Carrinho</span>
      </nav>
      <div className="cart-mobile-title">
        <Link to="/" aria-label="Voltar para as obras">
          <ArrowLeft size={18} />
        </Link>
        <h1>Carrinho de NFTs</h1>
      </div>
      <ErrorBox error={cart.error} retry={() => void cart.refetch()} />
      {cart.isPending ? (
        <Skeleton />
      ) : cart.data?.items.length ? (
        <div className="checkout-layout cart-body">
          <section className="cart-items" aria-label="Itens do carrinho">
            <div className="cart-table-heading" aria-hidden="true">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            {cart.data.items.map((item) => (
              <CartLine key={`${item.nftId}:${item.editionId}`} item={item} />
            ))}
          </section>
          <aside className="summary-panel cart-summary">
            <h2>Resumo da carteira</h2>
            <form
              className="cart-coupon"
              onSubmit={(e) => {
                e.preventDefault();
                if (cart.data)
                  applyCoupon.mutate({
                    code: draft.trim().toUpperCase(),
                    version: cart.data.version,
                  });
              }}
            >
              <Field
                label="Cupom de desconto"
                name="coupon"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  applyCoupon.reset();
                  setRejected(null);
                }}
                error={couponFailure}
                errorRole="alert"
                disabled={applyCoupon.isPending}
                placeholder="Experimente KURIO10"
              />
              <div className="button-row">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={applyCoupon.isPending || !quote.data}
                >
                  {applyCoupon.isPending ? "Verificando…" : "Aplicar cupom"}
                </Button>
                {coupon && (
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={applyCoupon.isPending}
                    onClick={() => {
                      applyCoupon.reset();
                      setRejected(null);
                      setCoupon("");
                      setDraft("");
                      localStorage.removeItem(couponKey(session?.user.id));
                    }}
                  >
                    Remover cupom
                  </Button>
                )}
              </div>
            </form>
            <ErrorBox
              error={
                applyCoupon.error &&
                errorData(applyCoupon.error).code !== "INVALID_COUPON"
                  ? applyCoupon.error
                  : null
              }
            />
            <ErrorBox
              error={
                quote.error && errorData(quote.error).code !== "INVALID_COUPON"
                  ? quote.error
                  : null
              }
              retry={() => void quote.refetch()}
            />
            {quote.isPending ? (
              <Skeleton />
            ) : (
              quote.data && <Summary quote={quote.data} />
            )}
            <Button
              asChild
              disabled={!quote.data || quote.isError || applyCoupon.isPending}
              className="full-width"
            >
              {quote.data && !quote.isError && !applyCoupon.isPending ? (
                <Link to="/checkout">
                  Conectar e finalizar <ArrowRight size={16} />
                </Link>
              ) : (
                <span>Confira o carrinho</span>
              )}
            </Button>
            <Link to="/" className="cart-continue text-link">
              Continuar explorando
            </Link>
            <p className="security-note">
              Todos os valores e pagamentos são simulados.
            </p>
          </aside>
        </div>
      ) : (
        !cart.error && (
          <Empty title="Seu carrinho está vazio">
            <p>Encontre uma obra para começar sua coleção.</p>
            <Button asChild>
              <Link to="/">Explorar obras</Link>
            </Button>
          </Empty>
        )
      )}
      {!!cart.data?.items.length && (
        <div className="cart-related">
          <RelatedNfts
            nftId={cart.data.items[0].nftId}
            title="Colecionadores também viram"
          />
        </div>
      )}
      <CommerceFooter />
    </>
  );
}
