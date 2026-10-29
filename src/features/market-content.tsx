import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
const articles = [
  {
    image: "ivory",
    date: "12",
    minutes: 6,
    title: "Como funciona a propriedade de NFTs",
    description: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    text: "Em um sistema real, um NFT associa um identificador a um registro em uma rede. Ter esse registro não transfere automaticamente direitos autorais sobre a imagem. Nesta aplicação tudo é uma simulação: recibos e carteiras são dados locais do navegador.",
  },
  {
    image: "emerald",
    date: "13",
    minutes: 2,
    title: "10 artistas digitais para acompanhar",
    description: "Conheça criadores que moldam a cultura digital.",
    text: "Esta é uma prévia editorial do layout. As obras e os criadores do catálogo são fixtures fictícias; não há curadoria ou recomendação de investimento. Explore o catálogo para conhecer as imagens de referência e experimentar busca, filtros e favoritos.",
  },
  {
    image: "sage",
    date: "15",
    minutes: 3,
    title: "Raridade, atributos e procedência",
    description: "Entenda raridade, procedência, ativos autorais e utilidade.",
    text: "Coleção, edição, quantidade disponível e atributos ajudam a apresentar uma obra. No projeto, esses dados vêm da API simulada. A edição única tem uma unidade; a edição aberta tem um estoque fictício maior. A disponibilidade é revalidada no checkout.",
  },
  {
    image: "golden",
    date: "15",
    minutes: 2,
    title: "Como proteger sua carteira",
    description: "Proteja sua carteira, seus ativos e sua identidade.",
    text: "Nesta demonstração nenhum segredo, chave privada, extensão ou saldo real é utilizado. Cadastre somente endereços fictícios. Os dados são mantidos no navegador e não representam uma carteira segura para uso em produção.",
  },
];
export function MarketContent() {
  const [article, setArticle] = useState<(typeof articles)[number] | null>(
    null,
  );
  return (
    <>
      <section
        id="criadores"
        className="market-promotions"
        aria-label="Explore a comunidade"
      >
        <article>
          <img
            src="/art/emerald.webp"
            width="280"
            height="240"
            loading="lazy"
            alt="Emerald Ape"
          />
          <div>
            <h2>Lançamentos gênesis de edição limitada</h2>
            <p>
              Colecione edições escassas diretamente dos criadores antes da
              revelação pública.
            </p>
            <Button asChild>
              <Link
                to="/"
                search={{ category: "Colecionáveis" }}
                hash="catalogo"
              >
                Explorar <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </article>
        <article>
          <img
            src="/art/ivory.webp"
            width="280"
            height="240"
            loading="lazy"
            alt="Ivory Baron"
          />
          <div>
            <h2>Arte digital selecionada e muito mais</h2>
            <p>
              Explore novos artistas, coleções e perspectivas da cultura
              digital.
            </p>
            <Button asChild>
              <Link
                to="/"
                search={{ category: "Arte digital" }}
                hash="catalogo"
              >
                Explorar <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </article>
      </section>
      <section className="market-journal" id="diario">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div>
          {articles.map((item) => (
            <article key={item.title}>
              <img
                src={`/art/${item.image}.webp`}
                alt=""
                width="270"
                height="200"
                loading="lazy"
              />
              <div>
                <small>
                  {item.date} de setembro | Leitura de {item.minutes} min
                </small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <button onClick={() => setArticle(item)}>
                  Ler mais <span aria-hidden="true">→</span>
                  <span className="sr-only">: {item.title}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Dialog
        open={!!article}
        onOpenChange={(open) => {
          if (!open) setArticle(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{article?.title}</DialogTitle>
          <DialogDescription>
            Prévia editorial da demonstração.
          </DialogDescription>
          <p>{article?.text}</p>
          <Button onClick={() => setArticle(null)}>Voltar à coleção</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
