import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  type RouteComponent,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import {
  Menu,
  ShoppingBag,
  ArrowUpRight,
  Leaf,
  ShieldCheck,
  Wallet as WalletIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "../components/ui/dialog";
import { ErrorPage, NotFoundPage } from "../components/error-page";
import { Skeleton } from "../components/shared";
import { useAuth } from "./session";
import { useRealtime } from "./realtime";
import { useCart } from "../features/data";
import { Catalog } from "../features/catalog";
import { Detail } from "../features/detail";
import { Scenarios } from "../features/scenarios";
import { categories, networks } from "../domain/types";
const CartPage = lazy(() =>
  import("../features/cart").then((module) => ({ default: module.CartPage })),
);
const Checkout = lazy(() =>
  import("../features/checkout").then((module) => ({
    default: module.Checkout,
  })),
);
const OrderPage = lazy(() =>
  import("../features/checkout").then((module) => ({
    default: module.OrderPage,
  })),
);
const Login = lazy(() =>
  import("../features/account").then((module) => ({ default: module.Login })),
);
const Profile = lazy(() =>
  import("../features/account").then((module) => ({ default: module.Profile })),
);
const Wallets = lazy(() =>
  import("../features/account").then((module) => ({ default: module.Wallets })),
);
const Favorites = lazy(() =>
  import("../features/favorites").then((module) => ({
    default: module.Favorites,
  })),
);
function Protected({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    returnTo = useRef(location.href);
  useEffect(() => {
    if (ready && !session)
      void navigate({
        to: "/login",
        search: { next: returnTo.current },
        replace: true,
      });
  }, [ready, session, navigate]);
  return ready && session ? children : <Skeleton />;
}
function Shell() {
  const { session, logout, expired } = useAuth(),
    cart = useCart(),
    live = useRealtime(),
    location = useLocation(),
    mounted = useRef(false);
  useEffect(() => {
    const headings: Record<string, string> = {
      "/": "Arte digital e colecionáveis",
      "/cart": "Seu carrinho",
      "/checkout": "Pagamento",
      "/login": "Entrar",
      "/register": "Criar conta",
      "/profile": "Perfil",
      "/wallets": "Carteiras",
      "/favorites": "Favoritos",
    };
    document.title = `KURIO — ${headings[location.pathname] || "Coleção de arte digital"}`;
    if (mounted.current)
      document.getElementById("main")?.focus({ preventScroll: true });
    mounted.current = true;
  }, [location.pathname]);
  const isCheckout = location.pathname === "/checkout",
    isOrder = location.pathname.startsWith("/order/"),
    isDetail = location.pathname.startsWith("/nft/");
  const navigation = (
    <>
      <Link to="/">Início</Link>
      <Link to="/" hash="catalogo">
        Mercado
      </Link>
      {session && (
        <>
          <Link to="/favorites">Favoritos</Link>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/wallets">Carteiras</Link>
        </>
      )}
    </>
  );
  return (
    <div
      className={`site-shell ${isCheckout ? "checkout-shell" : isOrder ? "order-shell" : isDetail ? "detail-shell" : ""}`}
    >
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      {!isOrder && (
        <header className="site-header">
          <Link to="/" className="logo" aria-label="Kurio, página inicial">
            KURIO<span>✳</span>
          </Link>
          <nav className="desktop-nav" aria-label="Principal">
            {navigation}
          </nav>
          <div className="header-actions">
            <Link
              to="/cart"
              className="cart-link"
              aria-label={`Carrinho, ${cart.data?.items.reduce((s, i) => s + i.quantity, 0) || 0} itens`}
            >
              <ShoppingBag size={20} />
              <span className="cart-count">
                {cart.data?.items.reduce((s, i) => s + i.quantity, 0) || 0}
              </span>
            </Link>
            {session ? (
              <>
                <Link to="/profile" className="user-link">
                  <img
                    src={session.user.avatar}
                    width="30"
                    height="30"
                    alt=""
                  />
                  <span>{session.user.name.split(" ")[0]}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  Sair
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login" search={{ next: location.href }}>
                  Entrar <ArrowUpRight size={15} />
                </Link>
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="mobile-menu"
                  aria-label="Abrir navegação"
                >
                  <Menu />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Navegar na Kurio</DialogTitle>
                <DialogDescription>
                  Explore o mercado e sua conta.
                </DialogDescription>
                <nav className="mobile-nav" aria-label="Navegação mobile">
                  {["/", "/cart", "/favorites", "/profile", "/wallets"].map(
                    (path, i) => (
                      <DialogClose asChild key={path}>
                        <Link to={path}>
                          {
                            [
                              "Início",
                              "Carrinho",
                              "Favoritos",
                              "Meu perfil",
                              "Carteiras",
                            ][i]
                          }
                        </Link>
                      </DialogClose>
                    ),
                  )}
                </nav>
              </DialogContent>
            </Dialog>
          </div>
        </header>
      )}
      {expired && (
        <div className="notice page-notice" role="status">
          Sua sessão expirou. Entre novamente para retomar o fluxo.
        </div>
      )}
      {live.notice && !isOrder && (
        <div className="notice page-notice" role="status">
          {live.notice}
          <button
            aria-label="Dispensar aviso"
            onClick={() => live.setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <main
        id="main"
        className={
          isCheckout
            ? "checkout-main"
            : isOrder
              ? "order-main"
              : isDetail
                ? "detail-main"
                : undefined
        }
        tabIndex={-1}
        data-connection-state={live.connected ? "connected" : "reconnecting"}
      >
        <Suspense fallback={<Skeleton />}>
          <Outlet />
        </Suspense>
      </main>
      {!isCheckout && !isOrder && !isDetail && (
        <footer>
          <div className="trust-strip">
            <div>
              <Leaf />
              <strong>Arte original</strong>
              <p>Novos olhares sobre a cultura digital.</p>
            </div>
            <div>
              <ShieldCheck />
              <strong>Experiência transparente</strong>
              <p>Preços, taxas e recibos à vista.</p>
            </div>
            <div>
              <WalletIcon />
              <strong>Você no controle</strong>
              <p>Uma demonstração inteiramente fictícia.</p>
            </div>
          </div>
          <div className="footer-bottom">
            <div>
              <Link to="/" className="logo">
                KURIO<span>✳</span>
              </Link>
              <p>Arte para quem enxerga além.</p>
            </div>
            <nav aria-label="Rodapé">
              <Link to="/">Explorar</Link>
              <Link to="/favorites">Favoritos</Link>
              <Link to="/profile">Minha conta</Link>
            </nav>
            <div className="footer-note">
              <span>FRONTEND CHALLENGE / JUNGLE GAMING</span>
              <Scenarios />
              <small>© 2026 Kurio. Demonstração de portfólio.</small>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
const root = createRootRoute({
  component: Shell,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  validateSearch: (s: Record<string, unknown>) => ({
    q: String(s.q || "").slice(0, 100),
    category: categories.includes(s.category as never)
      ? String(s.category)
      : "",
    network: networks.includes(s.network as never) ? String(s.network) : "",
    sort: ["featured", "newest", "price-asc", "price-desc"].includes(
      String(s.sort),
    )
      ? String(s.sort)
      : "featured",
    page: Math.max(1, Math.floor(Number(s.page) || 1)),
    min: /^\d+(\.\d{1,18})?$/.test(String(s.min)) ? String(s.min) : "",
    max: /^\d+(\.\d{1,18})?$/.test(String(s.max)) ? String(s.max) : "",
    returnTo: s.returnTo === "/checkout" ? "/checkout" : "",
    next:
      typeof s.next === "string" &&
      s.next.startsWith("/") &&
      !s.next.startsWith("//")
        ? s.next
        : "/",
  }),
});
const route = (path: string, component: RouteComponent) =>
  createRoute({ getParentRoute: () => root, path, component });
const routes = [
  route("/", Catalog),
  route("/nft/$nftId", Detail),
  route("/cart", CartPage),
  route("/checkout", () => (
    <Protected>
      <Checkout />
    </Protected>
  )),
  route("/order/$orderId", () => (
    <Protected>
      <OrderPage />
    </Protected>
  )),
  route("/login", () => <Login />),
  route("/register", () => <Login register />),
  route("/profile", () => (
    <Protected>
      <Profile />
    </Protected>
  )),
  route("/wallets", () => (
    <Protected>
      <Wallets />
    </Protected>
  )),
  route("/favorites", () => (
    <Protected>
      <Favorites />
    </Protected>
  )),
];
export const router = createRouter({
  routeTree: root.addChildren(routes),
  defaultPreload: "intent",
  defaultErrorComponent: ErrorPage,
  scrollRestoration: true,
});
