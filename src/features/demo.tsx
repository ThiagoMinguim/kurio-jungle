import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FlaskConical, CheckCircle2 } from "lucide-react";
import { useAuth } from "../app/session";
import { Button } from "../components/ui/button";
import { ErrorBox } from "../components/shared";
import { Scenarios } from "./scenarios";
import "./demo.css";

export function Demo() {
  const { session, login, ready } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function enter() {
    setBusy(true);
    setError(null);
    try {
      await login({ email: "alex@demo.test", password: "Demo123!" });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="demo-guide">
      <header>
        <span className="demo-kicker">
          <FlaskConical size={18} /> DEMONSTRAÇÃO INTERATIVA
        </span>
        <h1>Conheça a Kurio em dois minutos.</h1>
        <p>
          Explore, escolha uma obra e acompanhe uma compra do início ao recibo.
          Tudo acontece com dados fictícios, sem carteira externa ou dinheiro
          real.
        </p>
      </header>
      <div className="demo-start">
        <div>
          <h2>Comece sem criar uma conta</h2>
          <p>
            Conta de exemplo: <code>alex@demo.test</code>
            <br />
            Senha inicial: <code>Demo123!</code>
          </p>
        </div>
        {session ? (
          <div>
            <p role="status">
              <CheckCircle2 size={18} /> Conectado como {session.user.name}
            </p>
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar o catálogo <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        ) : (
          <Button disabled={!ready || busy} onClick={() => void enter()}>
            {busy ? "Entrando…" : "Entrar na conta de exemplo"}
          </Button>
        )}
        <ErrorBox error={error} />
        {!!error && (
          <p>
            Se a senha desta conta foi alterada neste navegador, use o login com
            a nova senha ou restaure a demonstração pelo laboratório abaixo. O
            reset apaga os dados locais fictícios.
          </p>
        )}
      </div>
      <ol className="demo-steps">
        <li>
          <span>01</span>
          <h2>Encontre uma obra</h2>
          <p>
            Combine busca, categoria e faixa de preço. Copie a URL ou
            recarregue: os filtros continuam aplicados.
          </p>
          <Link to="/" hash="catalogo">
            Abrir catálogo →
          </Link>
        </li>
        <li>
          <span>02</span>
          <h2>Monte seu carrinho</h2>
          <p>
            Abra o NFT, escolha a edição Original e adicione uma unidade. No
            carrinho, experimente o cupom <code>KURIO10</code>.
          </p>
          <Link to="/nft/$nftId" params={{ nftId: "nft-1" }}>
            Conhecer Emerald Ape →
          </Link>
        </li>
        <li>
          <span>03</span>
          <h2>Confira e confirme</h2>
          <p>
            A conta de exemplo já tem uma carteira fictícia. Revise o total,
            confirme e acompanhe o pedido até o recibo.
          </p>
          <Link to="/cart">Revisar carrinho →</Link>
        </li>
      </ol>
      <section className="demo-resilience">
        <h2>E quando algo dá errado?</h2>
        <p>
          Abra o laboratório, selecione um cenário e clique em “Ativar cenário
          sem reset”. Os dados existentes são preservados. Ao terminar, volte ao
          cenário Sucesso.
        </p>
        <div className="demo-cases">
          <article>
            <h3>Preço muda ao confirmar</h3>
            <p>
              Com uma obra no carrinho, ative o cenário e confirme o checkout. A
              compra exige nova revisão do preço, em vez de cobrar um valor
              inesperado.
            </p>
          </article>
          <article>
            <h3>Pagamento recusado</h3>
            <p>
              Ative o cenário e faça uma compra. O pedido mostra a recusa e os
              itens continuam no carrinho para uma nova tentativa.
            </p>
          </article>
          <article>
            <h3>Timeout após criar pedido</h3>
            <p>
              Confirme uma compra nesse cenário. A consulta de recuperação
              encontra o mesmo pedido, evitando uma segunda compra.
            </p>
          </article>
        </div>
        <Scenarios />
      </section>
      <details className="demo-limits">
        <summary>O que é simulado nesta experiência?</summary>
        <p>
          A API REST e a conexão Socket.IO são interceptadas no navegador. Os
          dados ficam neste navegador e não são compartilhados entre
          dispositivos. Ofertas e suporte são exemplos locais; login social,
          envio de e-mail e blockchain não são integrados. Atividade e recibos
          usam os pedidos que você criou na demonstração.
        </p>
        <p>
          O laboratório permite reset explícito para restaurar as contas e o
          catálogo. Não use dados pessoais reais.
        </p>
      </details>
    </section>
  );
}
