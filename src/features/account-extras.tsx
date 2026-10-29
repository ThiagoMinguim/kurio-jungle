import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  Clock3,
  ChartNoAxesCombined,
  LifeBuoy,
} from "lucide-react";
import { AccountNavigation } from "../components/account-navigation";
import { Button } from "../components/ui/button";
import { ErrorBox, Skeleton } from "../components/shared";
import { useAuth } from "../app/session";
import { get } from "../lib/api";
import type { Order } from "../domain/types";
import "./account.css";
import "./account-extras.css";

const sections = {
  "/activity": {
    title: "Sua atividade",
    description: "Acompanhe os pedidos feitos nesta demonstração.",
    icon: Clock3,
  },
  "/offers": {
    title: "Suas ofertas",
    description: "Experimente acompanhar e cancelar uma oferta fictícia.",
    icon: ChartNoAxesCombined,
  },
  "/downloads": {
    title: "Seus arquivos",
    description: "Guarde uma cópia dos recibos das compras simuladas.",
    icon: ArrowDownToLine,
  },
  "/support": {
    title: "Como podemos ajudar?",
    description: "Respostas rápidas para explorar a Kurio com tranquilidade.",
    icon: LifeBuoy,
  },
};
const statusNames = {
  pending: "Em processamento",
  confirmed: "Confirmado",
  declined: "Recusado",
};
function downloadReceipt(order?: Order) {
  const content = order
    ? `KURIO — RECIBO DEMONSTRATIVO\nPedido: ${order.id}\nStatus: ${statusNames[order.status]}\n${order.quote.lines.map((line) => `${line.quantity} × ${line.name} — ${line.total} ETH`).join("\n")}\nTotal: ${order.quote.total} ETH\nNenhum pagamento real foi realizado.`
    : "KURIO — ARQUIVO DE EXEMPLO\nEste arquivo demonstra o download de um recibo. Não representa uma compra, NFT ou transferência real.\nSeus pedidos confirmados aparecerão nesta página.";
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = order ? `kurio-recibo-${order.id}.txt` : "kurio-exemplo.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Offers() {
  const [status, setStatus] = useState<"active" | "cancelled">("active");
  return (
    <article className="account-demo-card">
      <img
        src="/art/emerald.webp"
        alt="Emerald Ape, exemplo de oferta"
        width="96"
        height="96"
      />
      <div>
        <span className="account-badge">EXEMPLO FICTÍCIO</span>
        <h2>Emerald Ape #042</h2>
        <p>
          Oferta ilustrativa de <strong>1.05 ETH</strong>
        </p>
        <p role="status">
          {status === "active"
            ? "Aguardando resposta do criador"
            : "Oferta de exemplo cancelada"}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => setStatus(status === "active" ? "cancelled" : "active")}
      >
        {status === "active" ? "Cancelar oferta" : "Restaurar exemplo"}
      </Button>
      <small>
        Esta interação não envia uma proposta e é reiniciada ao sair da página.
      </small>
    </article>
  );
}
function Support() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <div className="account-faq">
        {[
          [
            "Preciso de uma carteira real?",
            "Não. Cadastre um endereço fictício em Carteiras. A aplicação não consulta extensões nem movimenta saldo.",
          ],
          [
            "Onde encontro minha compra?",
            "Abra Atividade para acompanhar seus pedidos. Quando o pedido estiver confirmado, o recibo ficará disponível em Arquivos baixados.",
          ],
          [
            "Por que o preço mudou?",
            "O catálogo recebe atualizações simuladas. Antes de confirmar uma compra, o total e a disponibilidade são conferidos novamente.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <form
        className="account-support-form"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <h2>Experimente abrir um atendimento</h2>
        <p>Nenhuma mensagem será enviada. Use apenas informações fictícias.</p>
        <label htmlFor="support-message">Como podemos ajudar?</label>
        <textarea
          id="support-message"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          onChange={(event) => {
            setSent(false);
            event.currentTarget.setCustomValidity(
              event.currentTarget.value.trim().length < 10
                ? "Descreva sua dúvida em pelo menos 10 caracteres."
                : "",
            );
          }}
          placeholder="Descreva sua dúvida em pelo menos 10 caracteres"
        />
        <Button type="submit">Simular atendimento</Button>
        {sent && (
          <p className="success" role="status">
            Simulação concluída. Sua mensagem não foi enviada nem armazenada.
          </p>
        )}
      </form>
    </>
  );
}
export function AccountExtras() {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const section =
    sections[pathname as keyof typeof sections] || sections["/activity"];
  const orders = useQuery({
    queryKey: ["private", session?.token, "orders"],
    queryFn: ({ signal }) => get<Order[]>("/orders", signal),
    enabled:
      !!session && (pathname === "/activity" || pathname === "/downloads"),
    refetchInterval: 5000,
  });
  const downloads = pathname === "/downloads";
  const items = [...(orders.data || [])]
    .filter((order) => !downloads || order.status === "confirmed")
    .sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="account-grid">
      <AccountNavigation />
      <section
        className="account-content account-extras"
        key={`${session?.user.id}-${pathname}`}
      >
        <header className="account-section-heading">
          <section.icon aria-hidden="true" />
          <div>
            <h1>{section.title}</h1>
            <p>{section.description}</p>
          </div>
        </header>
        {pathname === "/offers" ? (
          <Offers />
        ) : pathname === "/support" ? (
          <Support />
        ) : (
          <>
            {orders.isPending ? (
              <Skeleton />
            ) : orders.isError ? (
              <ErrorBox
                error={orders.error}
                retry={() => void orders.refetch()}
              />
            ) : items.length ? (
              <div className="account-order-list">
                {items.map((order) => (
                  <article key={order.id}>
                    <div>
                      <span className="account-badge">
                        {statusNames[order.status]}
                      </span>
                      <h2>{order.quote.lines[0]?.name || "Pedido"}</h2>
                      <p>
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}{" "}
                        · {order.quote.total} ETH
                      </p>
                      <small>Pedido {order.id}</small>
                    </div>
                    {downloads ? (
                      <Button
                        variant="outline"
                        onClick={() => downloadReceipt(order)}
                      >
                        Baixar recibo
                      </Button>
                    ) : (
                      <Button asChild variant="outline">
                        <Link
                          to="/order/$orderId"
                          params={{ orderId: order.id }}
                        >
                          Ver pedido
                        </Link>
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="account-empty">
                <section.icon size={40} aria-hidden="true" />
                <h2>
                  {downloads
                    ? "Seus recibos começam aqui"
                    : "Sua coleção tem uma história pela frente"}
                </h2>
                <p>
                  {downloads
                    ? "Conclua uma compra simulada para encontrar seus recibos nesta página. Você também pode baixar um arquivo de exemplo."
                    : "Você ainda não fez pedidos nesta conta. Explore as obras e experimente o fluxo de compra."}
                </p>
                <Button asChild>
                  <Link to="/" hash="catalogo">
                    Explorar NFTs
                  </Link>
                </Button>
                {downloads && (
                  <Button variant="outline" onClick={() => downloadReceipt()}>
                    Baixar exemplo
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
