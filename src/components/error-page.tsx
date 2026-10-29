import { useEffect, useId, useRef } from "react";
import { ArrowLeft, CircleAlert, RefreshCw, SearchX } from "lucide-react";
import { Button } from "./ui/button";
export function ErrorPage({ notFound = false }: { notFound?: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null),
    titleId = useId();
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="error-page" aria-labelledby={titleId}>
      <div className="error-panel">
        <a href="/" className="error-brand" aria-label="Kurio, página inicial">
          KURIO
        </a>
        <div className="error-symbol" aria-hidden="true">
          {notFound ? <SearchX size={32} /> : <CircleAlert size={32} />}
        </div>
        <span className="error-kicker">
          {notFound ? "PÁGINA NÃO ENCONTRADA · 404" : "ERRO AO CARREGAR"}
        </span>
        <h1 id={titleId} ref={heading} tabIndex={-1}>
          {notFound ? "Esse caminho não existe." : "Esta página não carregou."}
        </h1>
        <p role="alert">
          {notFound
            ? "O endereço pode ter mudado. Volte ao catálogo para continuar explorando as obras."
            : "Ocorreu um problema ao abrir o conteúdo. Você pode tentar novamente ou voltar para o catálogo."}
        </p>
        <div className="error-actions">
          {!notFound && (
            <Button onClick={() => window.location.reload()}>
              <RefreshCw size={16} aria-hidden="true" />
              Tentar novamente
            </Button>
          )}
          <Button asChild variant={notFound ? "default" : "outline"}>
            <a href="/">
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar ao início
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
export const NotFoundPage = () => <ErrorPage notFound />;
