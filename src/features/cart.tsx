import { CartQuantity } from "../components/quantity";
import { useEffect, useState } from "react";
import { Tooltip } from "../components/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Trash2, ArrowRight } from "lucide-react";
import { errorData, get, post } from "../lib/api";
import type { CartItem, Nft, Quote } from "../domain/types";
import { eth } from "../domain/money";
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
  if (!nft.data)
    return (
      <>
        <Skeleton />
        <ErrorBox error={nft.error} retry={() => void nft.refetch()} />
      </>
    );
  const edition = nft.data.editions.find((e) => e.id === item.editionId)!;
  return (
    <article className="cart-line">
      <Link to="/nft/$nftId" params={{ nftId: item.nftId }}>
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
          {edition.name} / {nft.data.network}
        </p>
        <strong>{eth(edition.price)}</strong>
        {item.quantity > edition.stock && (
          <p role="alert">
            Quantidade superior ao estoque atual ({edition.stock}). Ajuste ou
            remova.
          </p>
        )}
      </div>
      <div className="cart-line-actions">
        <CartQuantity
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
      </div>
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
      <span className="eyebrow">SUA COLEÇÃO COMEÇA AQUI</span>
      <h1>
        Seu carrinho<span className="accent">.</span>
      </h1>
      <p className="muted">
        Revise suas obras e confira os valores atualizados.
      </p>
      <ErrorBox error={cart.error} retry={() => void cart.refetch()} />
      {cart.isPending ? (
        <Skeleton />
      ) : cart.data?.items.length ? (
        <div className="checkout-layout">
          <section aria-label="Itens do carrinho">
            {cart.data.items.map((item) => (
              <CartLine key={`${item.nftId}:${item.editionId}`} item={item} />
            ))}
            <Link to="/" className="text-link">
              ← Continuar explorando
            </Link>
          </section>
          <aside className="summary-panel">
            <h2>Resumo do pedido</h2>
            <form
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
                  Ir para pagamento <ArrowRight size={16} />
                </Link>
              ) : (
                <span>Confira o carrinho</span>
              )}
            </Button>
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
    </>
  );
}
