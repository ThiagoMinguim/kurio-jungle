import { Scenarios } from "../features/scenarios";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { emailError } from "../domain/validation";
import { Button } from "./ui/button";
import "./commerce-footer.css";
export function CommerceFooter() {
  const [email, setEmail] = useState(""),
    [feedback, setFeedback] = useState("");
  return (
    <footer className="commerce-footer">
      <div className="commerce-benefits">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital verificada com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
          ],
        ].map(([icon, title, text]) => (
          <div className="commerce-benefit" key={icon}>
            <span aria-hidden="true">{icon}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        ))}
        <form
          className="commerce-newsletter"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setFeedback(
              emailError(email) ||
                "Prévia de inscrição. Nenhum e-mail será enviado nesta demonstração.",
            );
          }}
        >
          <h2>Antecipe-se ao próximo lançamento</h2>
          <label className="sr-only" htmlFor="newsletter-preview">
            E-mail para novidades
          </label>
          <div>
            <input
              id="newsletter-preview"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFeedback("");
              }}
              placeholder="digite seu e-mail..."
              aria-invalid={!!feedback && !!emailError(email)}
              aria-describedby={
                feedback ? "newsletter-preview-feedback" : undefined
              }
            />
            <Button type="submit">Enviar</Button>
          </div>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
          {feedback && (
            <p
              id="newsletter-preview-feedback"
              role={emailError(email) ? "alert" : "status"}
            >
              {feedback}
            </p>
          )}
        </form>
      </div>
      <div className="commerce-contact">
        <strong>KURIO</strong>
        <span>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </span>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="commerce-links">
        <div>
          <h2>Meu perfil</h2>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/favorites">Minha coleção</Link>
          <Link to="/activity">Atividade</Link>
          <span>Estúdio do criador</span>
          <Link to="/favorites">Lista de interesse</Link>
        </div>
        <div>
          <h2>Central de ajuda</h2>
          {[
            "Central de ajuda",
            "Como comprar NFTs",
            "Carteira e segurança",
            "Política do mercado",
            "Denunciar item",
          ].map((text) => (
            <span key={text}>{text}</span>
          ))}
        </div>
        <div>
          <h2>Coleções</h2>
          {["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"].map(
            (category) => (
              <Link
                key={category}
                to="/"
                search={{
                  category,
                }}
              >
                {category}
              </Link>
            ),
          )}
        </div>
        <div>
          <h2>Redes sociais</h2>
          <div
            className="commerce-social"
            role="group"
            aria-label="Redes sociais ilustrativas"
          >
            {["f", "◎", "𝕏", "in", "▶"].map((text) => (
              <span aria-hidden="true" key={text}>
                {text}
              </span>
            ))}
          </div>
          <h2>Carteiras compatíveis</h2>
          <small className="wallet-brand-strip">
            METAMASK · WALLETCONNECT · COINBASE
          </small>
        </div>
      </div>
      <p className="commerce-copyright">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
      <div className="commerce-laboratory">
        <Link to="/demo" className="demo-footer-link">
          Guia da demonstração
        </Link>
        <Scenarios />
      </div>
    </footer>
  );
}
