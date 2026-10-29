import {
  nameError,
  emailError,
  passwordError,
  normalizeName,
  validAddress,
  validateForm,
  collectorDetailsErrors,
} from "../domain/validation";
import { http, HttpResponse, delay } from "msw";
import {
  db,
  save,
  publicUser,
  passwordHash,
  resetDatabase,
  scenarioNames,
  type Scenario,
} from "./database";
import { publish, disconnectMocks } from "./realtime";
import { fromWei, toWei, sameCartItem } from "../domain/money";
import type {
  Attempt,
  Cart,
  CartItem,
  Order,
  Quote,
  Session,
  Wallet,
} from "../domain/types";

class Failure extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "VALIDATION",
    public fields?: Record<string, string>,
    public quote?: Quote,
  ) {
    super(message);
  }
}
function fail(
  status: number,
  message: string,
  code?: string,
  fields?: Record<string, string>,
): never {
  throw new Failure(status, message, code, fields);
}
function session(request: Request, required = true): Session | undefined {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const found = db.sessions.find(
    (s) => s.token === token && s.expiresAt > Date.now(),
  );
  if (required && (!found || db.scenario === "expired-session"))
    fail(
      401,
      "Sua sessão expirou. Entre novamente para continuar.",
      "SESSION_EXPIRED",
    );
  return found;
}
function owner(request: Request) {
  return (
    session(request, !!request.headers.get("authorization"))?.user.id ||
    `guest:${request.headers.get("x-guest-id") || "anonymous"}`
  );
}
function cart(request: Request): Cart {
  return (db.carts[owner(request)] ||= { items: [], version: 1 });
}
function account(request: Request) {
  const s = session(request)!;
  return db.accounts.find((a) => a.id === s.user.id)!;
}
function validateItem(item: CartItem, reserveOrderId?: string) {
  const nft = db.nfts.find((n) => n.id === item.nftId);
  const edition = nft?.editions.find((e) => e.id === item.editionId);
  const reserved = Object.values(db.orders)
    .filter((o) => o.id !== reserveOrderId && o.status === "pending")
    .flatMap((o) => o.quote.lines)
    .filter((l) => sameCartItem(l, item))
    .reduce((n, l) => n + l.quantity, 0);
  if (!nft || !edition) fail(404, "NFT ou edição não encontrado.", "NOT_FOUND");
  if (
    !Number.isInteger(item.quantity) ||
    item.quantity < 1 ||
    item.quantity > edition.stock - reserved
  )
    fail(
      409,
      `Quantidade indisponível. Restam ${Math.max(0, edition.stock - reserved)} unidades.`,
      "STOCK_CONFLICT",
    );
  return { nft, edition };
}
function makeQuote(request: Request, coupon: string): Quote {
  const current = cart(request);
  if (!current.items.length) fail(422, "Seu carrinho está vazio.");
  if (coupon && coupon !== "KURIO10")
    fail(
      422,
      coupon === "EXPIRED" ? "Cupom expirado." : "Cupom inválido.",
      "INVALID_COUPON",
      { coupon: "Use KURIO10 para experimentar um desconto de 10%." },
    );
  const lines = current.items.map((item) => {
    const { nft, edition } = validateItem(item);
    return {
      ...item,
      name: nft.name,
      edition: edition.name,
      image: nft.image,
      price: edition.price,
      total: fromWei(toWei(edition.price) * BigInt(item.quantity)),
      nftVersion: nft.version,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + toWei(line.total), 0n);
  const discount = coupon ? subtotal / 10n : 0n;
  const fee = toWei("0.003");
  const snapshot = {
    lines,
    coupon,
    subtotal: fromWei(subtotal),
    discount: fromWei(discount),
    fee: fromWei(fee),
    total: fromWei(subtotal - discount + fee),
  };
  const quote: Quote = {
    ...snapshot,
    id: `quote-${db.next++}`,
    fingerprint: JSON.stringify(snapshot),
    expiresAt: Date.now() + 60000,
  };
  db.quotes[`${owner(request)}:${quote.id}`] = quote;
  save();
  return quote;
}
function updateNft(id: string, soldOut = false) {
  const nft = db.nfts.find((n) => n.id === id)!;
  nft.version++;
  nft.editions[0].price = fromWei(toWei(nft.editions[0].price) + toWei("0.1"));
  if (soldOut) nft.editions[0].stock = 0;
  save();
  publish({
    type: "nft.updated",
    resourceId: nft.id,
    version: nft.version,
    eventId: `nft:${nft.id}:${nft.version}`,
  });
}
export function settleOrders() {
  for (const order of Object.values(db.orders)) {
    if (order.status !== "pending" || order.settleAt > Date.now()) continue;
    order.status = order.decline ? "declined" : "confirmed";
    order.version++;
    if (order.status === "confirmed") {
      const current = db.carts[order.userId];
      for (const line of order.quote.lines) {
        const nft = db.nfts.find((n) => n.id === line.nftId)!;
        nft.editions.find((e) => e.id === line.editionId)!.stock -=
          line.quantity;
        nft.version++;
        const bought = current?.items.find((i) => sameCartItem(i, line));
        if (bought)
          bought.quantity = Math.max(0, bought.quantity - line.quantity);
        publish({
          type: "nft.updated",
          eventId: `stock:${order.id}:${nft.id}`,
          resourceId: nft.id,
          version: nft.version,
        });
      }
      if (current) {
        current.items = current.items.filter((i) => i.quantity > 0);
        current.version++;
      }
    }
    save();
    publish(
      {
        type: "order.updated",
        resourceId: order.id,
        version: order.version,
        eventId: `order:${order.id}:${order.version}`,
      },
      order.userId,
    );
  }
}
async function dispatch(request: Request) {
  const url = new URL(request.url),
    path = url.pathname.replace("/api", ""),
    method = request.method;
  const input = ["POST", "PUT", "PATCH"].includes(method)
    ? ((await request.json()) as Record<string, unknown>)
    : {};
  if (path.startsWith("/debug")) {
    if (path === "/debug/state")
      return {
        scenario: db.scenario,
        orders: Object.values(db.orders).map((o) => ({
          id: o.id,
          status: o.status,
        })),
        connections: "Socket.IO via MSW",
      };
    if (path === "/debug/reset") {
      const scenario = scenarioNames.includes(input.scenario as Scenario)
        ? (input.scenario as Scenario)
        : "success";
      disconnectMocks();
      await resetDatabase(scenario);
      return { ok: true };
    }
    if (path === "/debug/scenario") {
      if (!scenarioNames.includes(input.scenario as Scenario))
        fail(422, "Cenário inválido");
      db.scenario = input.scenario as Scenario;
      save();
      return { ok: true };
    }
    if (path === "/debug/action") {
      const id = String(input.nftId || "nft-1");
      if (input.action === "price" || input.action === "stock")
        updateNft(id, input.action === "stock");
      if (input.action === "duplicates") {
        const nft = db.nfts.find((n) => n.id === id)!;
        for (const version of [
          nft.version,
          nft.version,
          Math.max(0, nft.version - 1),
        ])
          publish({
            type: "nft.updated",
            resourceId: id,
            version,
            eventId: `duplicate:${id}:${version}`,
          });
      }
      if (input.action === "disconnect") disconnectMocks();
      if (input.action === "settle") {
        for (const order of Object.values(db.orders))
          order.settleAt = Date.now();
        settleOrders();
      }
      if (input.action === "expire") {
        for (const s of db.sessions) s.expiresAt = 0;
        save();
      }
      return { ok: true };
    }
  }
  if (db.scenario === "offline") return HttpResponse.error();
  if (db.scenario === "http-500")
    fail(
      503,
      "Serviço temporariamente indisponível. Tente novamente.",
      "UNAVAILABLE",
    );
  await delay(
    db.scenario === "slow"
      ? 1600
      : db.scenario === "out-of-order"
        ? url.searchParams.get("q")?.length === 1
          ? 1400
          : 80
        : 100,
  );
  settleOrders();
  if (path === "/session" && method === "GET") return session(request)!;
  if (path === "/session" && method === "DELETE") {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    db.sessions = db.sessions.filter((s) => s.token !== token);
    save();
    return { ok: true };
  }
  if ((path === "/session" || path === "/accounts") && method === "POST") {
    const email = String(input.email || "")
        .trim()
        .toLowerCase(),
      password = String(input.password || "");
    if (emailError(email))
      fail(422, "E-mail inválido.", "VALIDATION", {
        email: "Informe um e-mail válido.",
      });
    if (password.length < 8)
      fail(422, "Senha deve ter ao menos 8 caracteres.", "VALIDATION", {
        password: "Mínimo de 8 caracteres.",
      });
    let found = db.accounts.find((a) => a.email === email);
    if (path === "/accounts") {
      if (found)
        fail(409, "Já existe uma conta com este e-mail.", "CONFLICT", {
          email: "E-mail já cadastrado.",
        });
      const errors = validateForm(
        {
          ...input,
          name: String(input.name || ""),
          email,
          password,
          confirmPassword: password,
        } as Record<string, string>,
        "register",
      );
      if (Object.keys(errors).length)
        fail(422, "Revise os dados de cadastro.", "VALIDATION", errors);
      const salt = crypto.randomUUID();
      found = {
        id: `user-${crypto.randomUUID()}`,
        name: normalizeName(String(input.name)),
        email,
        salt,
        passwordHash: await passwordHash(password, salt),
        avatar: "/art/emerald.webp",
        wallets: [],
        favorites: [],
      };
      db.accounts.push(found);
    } else if (
      !found ||
      (await passwordHash(password, found.salt)) !== found.passwordHash
    )
      fail(401, "E-mail ou senha incorretos.", "INVALID_CREDENTIALS");
    const guest = db.carts[`guest:${request.headers.get("x-guest-id")}`];
    const own = (db.carts[found.id] ||= { items: [], version: 1 });
    for (const item of guest?.items || []) {
      const existing = own.items.find((i) => sameCartItem(i, item)),
        stock =
          db.nfts
            .find((n) => n.id === item.nftId)
            ?.editions.find((e) => e.id === item.editionId)?.stock || 0;
      if (stock > 0) {
        if (existing)
          existing.quantity = Math.min(
            stock,
            existing.quantity + item.quantity,
          );
        else
          own.items.push({ ...item, quantity: Math.min(stock, item.quantity) });
      }
    }
    if (guest) {
      guest.items = [];
      guest.version++;
    }
    own.version++;
    const result: Session = {
      user: publicUser(found),
      token: crypto.randomUUID(),
      expiresAt: Date.now() + 30 * 60000,
    };
    db.sessions.push(result);
    save();
    return result;
  }
  if (path === "/nfts") {
    let items = db.scenario === "empty" ? [] : [...db.nfts];
    const q = url.searchParams.get("q")?.toLowerCase() || "",
      category = url.searchParams.get("category"),
      network = url.searchParams.get("network");
    items = items.filter(
      (n) =>
        `${n.name} ${n.creator}`.toLowerCase().includes(q) &&
        (!category || n.category === category) &&
        (!network || n.network === network),
    );
    for (const direction of ["min", "max"]) {
      const val = url.searchParams.get(direction);
      if (val) {
        let value: bigint;
        try {
          value = toWei(val);
        } catch {
          fail(422, "Faixa de preço inválida.");
        }
        items = items.filter((n) =>
          direction === "min"
            ? toWei(n.editions[0].price) >= value
            : toWei(n.editions[0].price) <= value,
        );
      }
    }
    const sort = url.searchParams.get("sort");
    if (sort === "price-asc" || sort === "price-desc")
      items.sort((a, b) => {
        const delta = toWei(a.editions[0].price) - toWei(b.editions[0].price);
        return (
          (delta < 0n ? -1 : delta > 0n ? 1 : 0) *
          (sort === "price-asc" ? 1 : -1)
        );
      });
    if (sort === "newest") items.reverse();
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1),
      pages = Math.max(1, Math.ceil(items.length / 9));
    return {
      items: items
        .slice((page - 1) * 9, page * 9)
        .map((nft) => ({ ...nft, reviews: undefined })),
      total: items.length,
      pages,
      page,
    };
  }
  if (path.startsWith("/nfts/")) {
    const nft = db.nfts.find((n) => n.id === path.split("/")[2]);
    return nft || fail(404, "NFT não encontrado.", "NOT_FOUND");
  }
  if (path === "/favorites") {
    const a = account(request);
    if (method === "GET") return a.favorites;
    if (db.scenario === "favorite-failure")
      fail(
        500,
        "Não foi possível salvar favorito. Sua seleção foi restaurada.",
        "TRANSIENT",
      );
    const id = String(input.nftId);
    if (!db.nfts.some((n) => n.id === id)) fail(404, "NFT não encontrado.");
    a.favorites = input.favorite
      ? [...new Set([...a.favorites, id])]
      : a.favorites.filter((n) => n !== id);
    save();
    return a.favorites;
  }
  if (path === "/cart") {
    if (method === "GET") return cart(request);
    const current = cart(request),
      item = input as unknown as CartItem;
    if (method === "DELETE") {
      const nftId = url.searchParams.get("nftId"),
        editionId = url.searchParams.get("editionId");
      current.items = current.items.filter(
        (i) => !(i.nftId === nftId && i.editionId === editionId),
      );
    } else {
      validateItem(item);
      const existing = current.items.find((i) => sameCartItem(i, item));
      if (existing) {
        const quantity =
          method === "POST" ? existing.quantity + item.quantity : item.quantity;
        validateItem({ ...item, quantity });
        existing.quantity = quantity;
      } else current.items.push(item);
    }
    current.version++;
    save();
    return current;
  }
  if (path === "/quote" && method === "POST")
    return makeQuote(request, String(input.coupon || ""));
  if (path === "/orders" && method === "POST") {
    const s = session(request)!,
      attempt = input as unknown as Attempt,
      key = request.headers.get("idempotency-key");
    if (!key || key.length > 100)
      fail(422, "Chave de idempotência obrigatória.");
    const signature = JSON.stringify({
      quoteId: attempt.quoteId,
      name: attempt.name,
      email: attempt.email,
      walletId: attempt.walletId,
      network: attempt.network,
      details: attempt.details,
    });
    const previous = db.attempts[`${s.user.id}:${key}`];
    if (previous) {
      if (previous.signature !== signature)
        fail(409, "Chave já usada com outro conteúdo.", "IDEMPOTENCY_CONFLICT");
      return db.orders[previous.orderId];
    }
    const old = db.quotes[`${s.user.id}:${attempt.quoteId}`];
    if (!old) fail(409, "Revise sua cotação.", "QUOTE_EXPIRED");
    if (db.scenario === "price-change" || db.scenario === "sold-out") {
      const sold = db.scenario === "sold-out";
      db.scenario = "success";
      updateNft(old.lines[0].nftId, sold);
    }
    const fresh = makeQuote(request, old.coupon);
    if (old.expiresAt < Date.now() || old.fingerprint !== fresh.fingerprint)
      throw new Failure(
        409,
        "Preço, estoque ou taxas mudaram. Revise e confirme novamente.",
        "QUOTE_CHANGED",
        undefined,
        fresh,
      );
    const collectorErrors: Record<string, string> = {};
    const invalidName = nameError(String(attempt.name || "")),
      invalidEmail = emailError(String(attempt.email || ""));
    if (invalidName) collectorErrors.name = invalidName;
    if (invalidEmail) collectorErrors.email = invalidEmail;
    if (attempt.details) {
      if (typeof attempt.details !== "object" || Array.isArray(attempt.details))
        fail(422, "Dados do colecionador inválidos.", "VALIDATION");
      const details = Object.fromEntries(
        [
          "username",
          "profileName",
          "secondaryAddress",
          "referralCode",
          "ensSuffix",
          "notes",
          "provider",
        ].map((key) => [
          key,
          String(attempt.details![key as keyof typeof attempt.details] || ""),
        ]),
      );
      Object.assign(
        collectorErrors,
        collectorDetailsErrors({ ...details, network: attempt.network }),
      );
    }
    if (Object.keys(collectorErrors).length)
      fail(
        422,
        "Revise os dados do colecionador.",
        "VALIDATION",
        collectorErrors,
      );
    const wallet = account(request).wallets.find(
      (w) => w.id === attempt.walletId && w.network === attempt.network,
    );
    if (!wallet || !validAddress(wallet.address, wallet.network))
      fail(
        422,
        "Selecione uma carteira válida da rede escolhida.",
        "WALLET_ERROR",
      );
    if (
      db.scenario === "wallet-refused" ||
      db.scenario === "wallet-disconnected"
    )
      fail(
        409,
        db.scenario === "wallet-refused"
          ? "Conexão da carteira recusada."
          : "Carteira desconectada. Reconecte e tente novamente.",
        "WALLET_ERROR",
      );
    const order: Order = {
      id: `order-${crypto.randomUUID()}`,
      userId: s.user.id,
      version: 1,
      status: "pending",
      quote: structuredClone(old),
      createdAt: Date.now(),
      settleAt: Date.now() + (db.scenario === "pending" ? 300000 : 1800),
      decline: db.scenario === "payment-declined",
      transaction: `sim-${crypto.randomUUID()}`,
      collector: {
        name: normalizeName(attempt.name),
        email: attempt.email.trim().toLowerCase(),
      },
      wallet: structuredClone(wallet),
      ...(attempt.details ? { details: structuredClone(attempt.details) } : {}),
    };
    db.orders[order.id] = order;
    db.attempts[`${s.user.id}:${key}`] = { signature, orderId: order.id };
    save();
    setTimeout(settleOrders, 1900);
    if (db.scenario === "order-timeout") {
      await delay(12000);
      return order;
    }
    return order;
  }
  if (path === "/orders/attempt") {
    const s = session(request)!;
    const found = db.attempts[`${s.user.id}:${url.searchParams.get("key")}`];
    return found
      ? db.orders[found.orderId]
      : fail(404, "Tentativa não encontrada.", "NOT_FOUND");
  }
  if (path === "/orders") {
    const s = session(request)!;
    return Object.values(db.orders).filter((o) => o.userId === s.user.id);
  }
  if (path.startsWith("/orders/")) {
    const s = session(request)!,
      order = db.orders[path.split("/")[2]];
    return order?.userId === s.user.id
      ? order
      : fail(404, "Pedido não encontrado.", "NOT_FOUND");
  }
  if (path === "/profile") {
    const a = account(request);
    if (method === "GET") return publicUser(a);
    if (db.scenario === "validation")
      fail(422, "Dados recusados pelo cenário de validação.", "VALIDATION", {
        name: "Nome inválido no cenário de demonstração.",
      });
    const name = normalizeName(String(input.name || "")),
      email = String(input.email || "")
        .trim()
        .toLowerCase(),
      avatar = String(input.avatar || a.avatar);
    const profileErrors = validateForm({ name, email }, "profile");
    if (Object.keys(profileErrors).length)
      fail(422, "Revise nome e e-mail.", "VALIDATION", profileErrors);
    if (db.accounts.some((other) => other.id !== a.id && other.email === email))
      fail(409, "E-mail já cadastrado.", "CONFLICT", {
        email: "E-mail já cadastrado.",
      });
    if (!/^\/art\/(emerald|sage|ivory|golden)\.webp$/.test(avatar))
      fail(422, "Avatar inválido.");
    a.name = name;
    a.email = email;
    a.avatar = avatar;
    for (const s of db.sessions.filter((s) => s.user.id === a.id))
      s.user = publicUser(a);
    save();
    return publicUser(a);
  }
  if (path === "/password") {
    const a = account(request),
      old = String(input.currentPassword || ""),
      next = String(input.newPassword || "");
    if ((await passwordHash(old, a.salt)) !== a.passwordHash)
      fail(422, "Senha atual incorreta.", "VALIDATION", {
        currentPassword: "Senha atual incorreta.",
      });
    if (passwordError(next) || next === old)
      fail(
        422,
        "A nova senha deve ser diferente e ter 8 caracteres.",
        "VALIDATION",
        {
          newPassword:
            passwordError(next) || "Escolha uma senha diferente da atual.",
        },
      );
    a.salt = crypto.randomUUID();
    a.passwordHash = await passwordHash(next, a.salt);
    save();
    return { ok: true };
  }
  if (path.startsWith("/wallets/") && method === "DELETE") {
    const a = account(request),
      id = decodeURIComponent(path.slice("/wallets/".length));
    const wallet = a.wallets.find((w) => w.id === id);
    if (!wallet) fail(404, "Carteira não encontrada.", "NOT_FOUND");
    if (db.scenario === "validation")
      fail(
        422,
        "Não foi possível excluir a carteira neste cenário.",
        "VALIDATION",
      );
    a.wallets = a.wallets.filter((w) => w.id !== id);
    if (a.wallets.length && !a.wallets.some((w) => w.primary))
      a.wallets[0].primary = true;
    save();
    return a.wallets;
  }
  if (path === "/wallets") {
    const a = account(request);
    if (method === "GET") return a.wallets;
    const wallet = input as unknown as Wallet;
    wallet.name = String(wallet.name || "").trim();
    wallet.address = String(wallet.address || "").trim();
    const walletErrors = validateForm(
      { name: wallet.name, address: wallet.address, network: wallet.network },
      "wallet",
    );
    if (Object.keys(walletErrors).length)
      fail(422, "Dados da carteira inválidos.", "VALIDATION", walletErrors);
    const comparableAddress = (value: string) =>
      wallet.network === "Solana" ? value : value.toLowerCase();
    if (
      a.wallets.some(
        (w) =>
          w.id !== wallet.id &&
          w.network === wallet.network &&
          comparableAddress(w.address) === comparableAddress(wallet.address),
      )
    )
      fail(409, "Esta carteira já está cadastrada nesta rede.", "CONFLICT", {
        address: "Endereço já cadastrado nesta rede.",
      });
    if (db.scenario === "validation")
      fail(422, "Carteira recusada pelo cenário de validação.");
    const existing = a.wallets.find((w) => w.id === wallet.id);
    if (!existing && a.wallets.length >= 2)
      fail(422, "Cadastre no máximo duas carteiras.");
    if (wallet.primary) a.wallets.forEach((w) => (w.primary = false));
    if (existing) Object.assign(existing, wallet);
    else
      a.wallets.push({
        ...wallet,
        id: crypto.randomUUID(),
        primary: wallet.primary || a.wallets.length === 0,
      });
    if (!a.wallets.some((w) => w.primary)) a.wallets[0].primary = true;
    save();
    return a.wallets;
  }
  fail(404, "Recurso não encontrado.", "NOT_FOUND");
}
export const restHandler = http.all("/api/*", async ({ request }) => {
  try {
    const result = await dispatch(request);
    return result instanceof Response ? result : HttpResponse.json(result);
  } catch (error) {
    if (error instanceof Failure)
      return HttpResponse.json(
        {
          message: error.message,
          code: error.code,
          fields: error.fields,
          quote: error.quote,
        },
        { status: error.status },
      );
    console.error(error);
    return HttpResponse.json(
      { message: "Falha inesperada no simulador.", code: "INTERNAL" },
      { status: 500 },
    );
  }
});
