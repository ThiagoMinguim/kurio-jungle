import { CommerceFooter } from "../components/commerce-footer";
import { ValidatedForm } from "../components/validated-form";
import { shortenAddress, validAddress } from "../domain/validation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Clock3, XCircle, X } from "lucide-react";
import { useAuth } from "../app/session";
import { api, errorData, get, post } from "../lib/api";
import { queryClient } from "../lib/query";
import type { Attempt, Order, Quote, CollectorDetails } from "../domain/types";
import { eth } from "../domain/money";
import { Button } from "../components/ui/button";
import { Empty, ErrorBox, Select, Skeleton } from "../components/shared";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { useCart, useWallets } from "./data";
import { couponKey, Summary } from "./cart";
import {
  CollectorFields,
  WalletChoices,
  ProviderChoices,
  QuoteItems,
  ReviewData,
  ThankYouMark,
} from "./checkout-presentation";
import "./checkout.css";
const mobileQuery = "(max-width: 680px)";
const subscribeMobile = (listener: () => void) => {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const readMobile = () => window.matchMedia(mobileQuery).matches;
const attemptKey = (id: string) => `kurio.attempt.${id}`;
export function Checkout() {
  const { session } = useAuth(),
    cart = useCart(),
    wallets = useWallets(),
    navigate = useNavigate(),
    [name, setName] = useState(session!.user.name),
    [email, setEmail] = useState(session!.user.email),
    [walletId, setWallet] = useState(""),
    [networkOverride, setNetwork] = useState(""),
    [review, setReview] = useState<Quote | null>(null),
    [sending, setSending] = useState(false),
    [failure, setFailure] = useState<unknown>(null),
    [notice, setNotice] = useState(""),
    lock = useRef(false);
  const mobile = useSyncExternalStore(subscribeMobile, readMobile, () => false);
  const [details, setDetails] = useState<CollectorDetails>(() => ({
    username: (
      session!.user.email.split("@")[0].replace(/[^\p{L}\p{N}_.-]/gu, "") + "_"
    ).slice(0, 40),
    profileName: session!.user.name,
    secondaryAddress: "",
    referralCode: "",
    ensSuffix: ".eth",
    notes: "",
    provider: "Coinbase Wallet",
  }));
  const userId = session!.user.id;
  const selectedWallet =
    wallets.data?.find((w) => w.id === walletId) ||
    wallets.data?.find((w) => w.primary);
  const network = networkOverride || selectedWallet?.network || "Ethereum";
  const walletValid =
    !!selectedWallet &&
    validAddress(selectedWallet.address, selectedWallet.network) &&
    selectedWallet.network === network;
  const coupon =
    localStorage.getItem(couponKey(session!.user.id)) ||
    localStorage.getItem(couponKey()) ||
    "";
  const quote = useQuery({
    queryKey: [
      "private",
      session!.token,
      "checkout-quote",
      cart.data?.version,
      coupon,
    ],
    queryFn: () => post<Quote>("/quote", { coupon }),
    enabled: !!cart.data?.items.length,
    retry: false,
  });
  useEffect(() => {
    let alive = true;
    async function recover() {
      try {
        const stored = localStorage.getItem(attemptKey(userId));
        if (stored) {
          const attempt = JSON.parse(stored) as Attempt;
          const order = await get<Order>(`/orders/attempt?key=${attempt.key}`);
          if (alive)
            void navigate({
              to: "/order/$orderId",
              params: { orderId: order.id },
            });
        } else {
          const orders = await get<Order[]>("/orders");
          const pending = orders.find((o) => o.status === "pending");
          if (alive && pending)
            void navigate({
              to: "/order/$orderId",
              params: { orderId: pending.id },
            });
        }
      } catch {
        /* No created attempt: keep the original key for a deliberate retry. */
      }
    }
    void recover();
    return () => {
      alive = false;
    };
  }, [userId, navigate]);
  async function submit() {
    if (lock.current || !review) return;
    lock.current = true;
    setSending(true);
    setFailure(null);
    try {
      const stored = localStorage.getItem(attemptKey(userId));
      let attempt: Attempt | undefined = stored
        ? (JSON.parse(stored) as Attempt)
        : undefined;
      if (!attempt) {
        const fresh = await post<Quote>("/quote", { coupon });
        if (fresh.fingerprint !== review.fingerprint) {
          setReview(fresh);
          setNotice(
            "A cotação mudou. Confira os novos valores e confirme novamente.",
          );
          return;
        }
        attempt = {
          key: crypto.randomUUID(),
          quoteId: fresh.id,
          name,
          email,
          walletId: walletId || wallets.data?.find((w) => w.primary)?.id || "",
          network,
          details: structuredClone(details),
        };
        localStorage.setItem(attemptKey(userId), JSON.stringify(attempt));
      }
      let order: Order;
      try {
        order = (
          await api.post<Order>("/orders", attempt, {
            headers: { "Idempotency-Key": attempt.key },
          })
        ).data;
      } catch (error) {
        const data = errorData(error);
        if (data.code === "QUOTE_CHANGED") {
          localStorage.removeItem(attemptKey(userId));
          setReview(data.quote!);
          setNotice(data.message);
          return;
        }
        if (
          [
            "STOCK_CONFLICT",
            "WALLET_ERROR",
            "VALIDATION",
            "QUOTE_EXPIRED",
          ].includes(data.code)
        ) {
          localStorage.removeItem(attemptKey(userId));
          throw error;
        }
        try {
          order = await get<Order>(`/orders/attempt?key=${attempt.key}`);
        } catch {
          throw error;
        }
      }
      setReview(null);
      void navigate({ to: "/order/$orderId", params: { orderId: order.id } });
    } catch (error) {
      setFailure(error);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }
  const disabled =
    !quote.data || quote.isError || !wallets.data?.length || !walletValid;
  const networkField = (
    <Select
      label="Rede para pagamento"
      id="checkout-network"
      name="network"
      required
      value={network}
      onChange={(e) => setNetwork(e.target.value)}
    >
      <option>Ethereum</option>
      <option>Polygon</option>
      <option>Solana</option>
    </Select>
  );
  const walletField = (
    <Select
      label="Endereço da carteira"
      aria-label="Carteira cadastrada, endereço da carteira"
      required
      id="checkout-wallet"
      value={selectedWallet?.id || ""}
      onChange={(event) => {
        setWallet(event.target.value);
        setNetwork(
          wallets.data!.find((wallet) => wallet.id === event.target.value)!
            .network,
        );
      }}
    >
      {!wallets.data?.length && (
        <option value="">Cadastre uma carteira para continuar</option>
      )}
      {wallets.data?.map((wallet) => (
        <option key={wallet.id} value={wallet.id}>
          {shortenAddress(wallet.address, wallet.network)} | {wallet.name}
          {wallet.primary ? " (principal)" : ""}
        </option>
      ))}
    </Select>
  );
  const collector = (
    <CollectorFields
      name={name}
      email={email}
      onName={setName}
      onEmail={setEmail}
      details={details}
      onDetails={setDetails}
      address={selectedWallet?.address || ""}
      networkField={mobile ? undefined : networkField}
      walletField={walletField}
      mobile={mobile}
    />
  );
  const walletError =
    wallets.data?.length && !walletValid ? (
      <p role="alert" className="field-error">
        Confira o endereço da carteira e selecione a mesma rede cadastrada.
      </p>
    ) : null;
  const confirmButton = (
    <Button className="checkout-confirm" type="submit" disabled={disabled}>
      Confirmar compra
    </Button>
  );
  return (
    <>
      {mobile ? (
        <div className="payment-mobile-heading">
          <Link to="/cart" aria-label="Voltar ao carrinho">
            <ArrowLeft size={18} />
          </Link>
          <h1>Pagamento com carteira</h1>
        </div>
      ) : (
        <>
          <nav className="payment-breadcrumb" aria-label="Localização">
            <Link to="/">Início</Link>
            <span>/</span>
            <Link to="/" hash="catalogo">
              Mercado
            </Link>
            <span>/</span>
            <span aria-current="page">Pagamento</span>
          </nav>
          <h1 className="sr-only">Pagamento</h1>
        </>
      )}
      <ErrorBox error={cart.error} retry={() => void cart.refetch()} />
      <ErrorBox error={wallets.error} retry={() => void wallets.refetch()} />
      {cart.isPending || wallets.isPending ? (
        <Skeleton />
      ) : !cart.data?.items.length ? (
        <Empty title="Adicione uma obra antes de continuar">
          <Link to="/">Explorar coleção</Link>
        </Empty>
      ) : (
        <ValidatedForm
          mode="checkout"
          className={`payment-form ${mobile ? "payment-mobile" : "payment-desktop"}`}
          onSubmit={(event) => {
            event.preventDefault();
            setFailure(null);
            setNotice("");
            if (quote.data) setReview(quote.data);
          }}
        >
          {mobile ? (
            <>
              <WalletChoices
                wallets={wallets.data || []}
                selectedId={selectedWallet?.id}
                network={network}
                onNetwork={setNetwork}
                onSelect={(wallet) => {
                  setWallet(wallet.id);
                  setNetwork(wallet.network);
                }}
              />
              <ProviderChoices
                value={details.provider}
                onChange={(provider) =>
                  setDetails((old) => ({ ...old, provider }))
                }
              />
              {walletError}
              <ErrorBox
                error={quote.error}
                retry={() => void quote.refetch()}
              />
              {quote.isPending ? (
                <Skeleton />
              ) : (
                quote.data && (
                  <div className="payment-mobile-total">
                    <span>Total:</span>
                    <strong data-testid="quote-total">
                      {eth(quote.data.total)}
                    </strong>
                  </div>
                )
              )}
              <details className="collector-disclosure">
                <summary>Dados do colecionador</summary>
                {collector}
              </details>
              {confirmButton}
            </>
          ) : (
            <>
              <section className="collector-pane">
                <h2>Perfil do colecionador</h2>
                {collector}
              </section>
              <aside className="payment-summary">
                <h2>Seus NFTs</h2>
                {quote.data && (
                  <>
                    <QuoteItems quote={quote.data} />
                    <Link to="/cart" className="payment-promo">
                      Tem um código promocional? Aplique aqui
                    </Link>
                    <Summary quote={quote.data} />
                  </>
                )}
                <ErrorBox
                  error={quote.error}
                  retry={() => void quote.refetch()}
                />
                {quote.isPending && <Skeleton />}
                <ProviderChoices
                  value={details.provider}
                  onChange={(provider) =>
                    setDetails((old) => ({ ...old, provider }))
                  }
                />
                {walletError}
                {confirmButton}
              </aside>
            </>
          )}
        </ValidatedForm>
      )}
      {!mobile && <CommerceFooter />}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!sending && !open) setReview(null);
        }}
      >
        <DialogContent
          className="purchase-review-dialog"
          onInteractOutside={(event) => {
            if (sending) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (sending) event.preventDefault();
          }}
        >
          <DialogTitle>Revise antes de confirmar</DialogTitle>
          <DialogDescription>
            Esta compra usa apenas dados fictícios. Confira os dados do
            colecionador, itens, carteira, rede e valores.
          </DialogDescription>
          {review && (
            <>
              <section className="review-items" aria-label="Itens da compra">
                <h2>Seus NFTs</h2>
                <QuoteItems quote={review} labeled />
              </section>
              <ReviewData
                name={name}
                email={email}
                wallet={selectedWallet}
                network={network}
                details={details}
              />
              <Summary quote={review} />
            </>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
          <ErrorBox error={failure} />
          <Button disabled={sending} onClick={() => void submit()}>
            {sending ? "Verificando pedido…" : "Confirmar compra simulada"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OrderPage() {
  const { orderId } = useParams({ strict: false }),
    { session } = useAuth(),
    userId = session!.user.id;
  const [showReceipt, setShowReceipt] = useState(false);
  const query = useQuery({
    queryKey: ["private", session!.token, "order", orderId],
    queryFn: ({ signal }) => get<Order>(`/orders/${orderId}`, signal),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 2000 : false),
  });
  useEffect(() => {
    if (query.data?.status && query.data.status !== "pending") {
      localStorage.removeItem(attemptKey(userId));
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    }
  }, [query.data?.status, userId]);
  const order = query.data;
  return (
    <>
      <ErrorBox error={query.error} retry={() => void query.refetch()} />
      {query.isPending ? (
        <Skeleton />
      ) : (
        order && (
          <>
            <article className={`order-confirmation ${order.status}`}>
              <Link
                className="order-close"
                to="/"
                aria-label="Continuar explorando"
              >
                <X size={18} />
              </Link>
              <header className="order-confirmation-heading">
                {order.status === "confirmed" ? (
                  <ThankYouMark />
                ) : order.status === "declined" ? (
                  <XCircle
                    className="order-state-mark"
                    size={72}
                    aria-hidden="true"
                  />
                ) : (
                  <Clock3
                    className="order-state-mark"
                    size={72}
                    aria-hidden="true"
                  />
                )}
                <h1>
                  {order.status === "confirmed"
                    ? "Seus NFTs agora estão na sua carteira"
                    : order.status === "declined"
                      ? "Pagamento recusado."
                      : "Seu pedido está em processamento."}
                </h1>
              </header>
              <dl className="order-metadata">
                <div>
                  <dt>ID da transação</dt>
                  <dd title={order.transaction}>
                    {order.transaction.slice(0, 7)}…
                    {order.transaction.slice(-4)}
                  </dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                      .format(order.createdAt)
                      .replaceAll(" de ", " ")
                      .replaceAll(".", "")}
                  </dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{eth(order.quote.total)}</dd>
                </div>
                <div>
                  <dt>Carteira</dt>
                  <dd>{order.details?.provider || order.wallet.name}</dd>
                </div>
              </dl>
              <section className="order-transaction">
                <h2>Detalhes da transação</h2>
                <QuoteItems quote={order.quote} receipt />
                <Summary quote={order.quote} />
                <p className="order-outcome" role="status">
                  {order.status === "confirmed"
                    ? `Transação confirmada na simulação de ${order.wallet.network}. Os NFTs deste pedido estão vinculados à carteira selecionada no ambiente demonstrativo. Nenhuma transferência real foi realizada.`
                    : order.status === "declined"
                      ? "Os itens continuam no carrinho. Nenhum pagamento real foi feito."
                      : "Você pode recarregar ou reconectar. A tentativa será recuperada sem criar outra compra."}
                </p>
                {order.status === "declined" ? (
                  <Button asChild>
                    <Link to="/cart">Voltar ao carrinho</Link>
                  </Button>
                ) : (
                  <Button onClick={() => setShowReceipt(true)}>
                    Ver recibo
                  </Button>
                )}
              </section>
            </article>
            <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
              <DialogContent className="purchase-review-dialog">
                <DialogTitle>
                  Recibo{" "}
                  {order.status === "confirmed" ? "confirmado" : "provisório"}
                </DialogTitle>
                <DialogDescription>
                  Registro desta demonstração. Este pedido não possui transação
                  em um explorador blockchain real.
                </DialogDescription>
                <dl className="receipt-reference">
                  <div>
                    <dt>Pedido</dt>
                    <dd>{order.id}</dd>
                  </div>
                  <div>
                    <dt>Referência fictícia</dt>
                    <dd>{order.transaction}</dd>
                  </div>
                </dl>
                <ReviewData
                  name={order.collector.name}
                  email={order.collector.email}
                  wallet={order.wallet}
                  network={order.wallet.network}
                  details={order.details}
                />
              </DialogContent>
            </Dialog>
          </>
        )
      )}
    </>
  );
}
