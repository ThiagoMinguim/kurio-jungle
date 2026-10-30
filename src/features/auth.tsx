import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Catalog } from "./catalog";
import { useAuth } from "../app/session";
import { useCompactViewport } from "../lib/viewport";
import { internalDestination, dismissLogin } from "../lib/search";
import { errorData } from "../lib/api";
import { ValidatedForm } from "../components/validated-form";
import { Field, ErrorBox } from "../components/shared";
import { PasswordField } from "../components/password-field";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import "./auth.css";
export function Login({ register = false }: { register?: boolean }) {
  const { login, session, ready } = useAuth(),
    navigate = useNavigate(),
    mobile = useCompactViewport();
  const search = useSearch({ strict: false }) as Record<string, unknown> & {
    next?: string;
  };
  const [failure, setFailure] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [help, setHelp] = useState<"password" | "social" | null>(null);
  const helpOpener = useRef<HTMLButtonElement | null>(null);
  const helpTitle =
    help === "password"
      ? "Recuperação de senha"
      : "Login social nesta demonstração";
  const helpDescription =
    help === "password"
      ? "O desafio usa contas fictícias e não envia e-mails. Você pode entrar com thiago@demo.test e Demo123! ou criar outra conta de demonstração."
      : "Google e Facebook aparecem na referência visual. Nesta demonstração, a autenticação usa somente a API simulada; nenhuma conta externa é conectada.";
  const openHelp = (kind: "password" | "social", opener: HTMLButtonElement) => {
    helpOpener.current = opener;
    setHelp(kind);
  };
  useEffect(() => {
    if (!help && helpOpener.current?.isConnected) helpOpener.current.focus();
  }, [help]);
  const next = internalDestination(search.next) || "/";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    setBusy(true);
    try {
      await login(
        Object.fromEntries(new FormData(event.currentTarget)) as Record<
          string,
          string
        >,
        register,
      );
      void navigate({ href: next });
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  const errors = failure ? errorData(failure).fields : {};
  const contents = (
    <>
      {mobile && (
        <Link
          className="auth-wordmark"
          to="/"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>
      )}
      {mobile ? (
        <h1>{register ? "Criar perfil de colecionador" : "Entrar"}</h1>
      ) : (
        <div className="auth-tabs">
          <Link
            to="/login"
            search={{ next }}
            aria-current={!register ? "page" : undefined}
          >
            Entrar
          </Link>
          <span>|</span>
          <Link
            to="/register"
            search={{ next }}
            aria-current={register ? "page" : undefined}
          >
            Criar conta
          </Link>
        </div>
      )}
      {!mobile && (
        <p className="auth-description">
          {register
            ? "Crie seu perfil de colecionador e comece a explorar a arte digital."
            : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
        </p>
      )}
      {ready && session ? (
        <div className="auth-connected">
          <p>Você já está conectado como {session.user.name}.</p>
          <Button asChild>
            <Link to="/profile">Abrir perfil</Link>
          </Button>
        </div>
      ) : (
        <ValidatedForm
          className="auth-fields"
          mode={register ? "register" : "login"}
          onSubmit={(event) => void submit(event)}
        >
          {register && (
            <Field
              label="Nome"
              name="name"
              placeholder="Nome do colecionador"
              required
              minLength={2}
              autoComplete="name"
              error={errors?.name}
            />
          )}
          <Field
            label="E-mail"
            name="email"
            type="email"
            placeholder={register ? "Digite seu e-mail" : "contato@email.com"}
            required
            autoComplete="username"
            error={errors?.email}
          />
          <PasswordField
            label="Senha"
            name="password"
            placeholder={register ? "Senha" : "••••••••••••"}
            required
            minLength={8}
            autoComplete={register ? "new-password" : "current-password"}
            error={errors?.password}
          />
          {register && (
            <PasswordField
              label="Confirmar senha"
              name="confirmPassword"
              placeholder="Confirmar senha"
              required
              minLength={8}
              autoComplete="new-password"
              error={errors?.confirmPassword}
            />
          )}
          {!register && (
            <button
              type="button"
              className="auth-forgot"
              onClick={(event) => openHelp("password", event.currentTarget)}
            >
              Esqueceu a senha?
            </button>
          )}
          <ErrorBox error={failure} />
          <Button
            type="submit"
            className="auth-submit"
            aria-label={register ? "Criar conta fictícia" : "Entrar"}
            disabled={busy}
          >
            {busy
              ? "Aguarde…"
              : register
                ? mobile
                  ? "Criar perfil"
                  : "Criar conta"
                : "Entrar"}
          </Button>
        </ValidatedForm>
      )}
      <div className="auth-social">
        <p>
          <span>Ou continue com</span>
        </p>
        <button onClick={(event) => openHelp("social", event.currentTarget)}>
          <span className="google-mark" aria-hidden="true">
            G
          </span>
          Continuar com Google
        </button>
        <button onClick={(event) => openHelp("social", event.currentTarget)}>
          <span className="facebook-mark" aria-hidden="true">
            f
          </span>
          Continuar com Facebook
        </button>
      </div>
      <p className="auth-switch">
        {register ? "Já tem uma conta?" : "Novo na Kurio?"}{" "}
        <Link to={register ? "/login" : "/register"} search={{ next }}>
          {register ? "Entre" : "Crie uma conta"}
        </Link>
      </p>
      <p className="demo-access">
        <Link to="/demo">Testar com uma conta de exemplo</Link>
      </p>
    </>
  );
  return (
    <>
      {!mobile && (
        <div className="auth-catalog-backdrop" aria-hidden="true" inert>
          <Catalog />
        </div>
      )}
      {mobile ? (
        <section className={`auth-card ${register ? "auth-register" : ""}`}>
          {contents}
        </section>
      ) : (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              if (help) setHelp(null);
              else
                void navigate({
                  href: dismissLogin(next, search),
                  resetScroll: false,
                });
            }
          }}
        >
          <DialogContent
            className={`auth-card auth-desktop ${register ? "auth-register" : ""}`}
            onEscapeKeyDown={(event) => {
              if (help) {
                event.preventDefault();
                setHelp(null);
              }
            }}
          >
            <DialogTitle className={help ? "auth-help-title" : "sr-only"}>
              {help ? helpTitle : register ? "Criar conta" : "Entrar na Kurio"}
            </DialogTitle>
            <DialogDescription
              className={help ? "auth-help-description" : "sr-only"}
            >
              {help
                ? helpDescription
                : "Autenticação demonstrativa do colecionador."}
            </DialogDescription>
            <div className="auth-form-content" hidden={!!help}>
              {contents}
            </div>
            {help && <Button onClick={() => setHelp(null)}>Entendi</Button>}
          </DialogContent>
        </Dialog>
      )}
      {mobile && (
        <Dialog
          open={!!help}
          onOpenChange={(open) => {
            if (!open) setHelp(null);
          }}
        >
          <DialogContent>
            <DialogTitle>{helpTitle}</DialogTitle>
            <DialogDescription>{helpDescription}</DialogDescription>
            <Button onClick={() => setHelp(null)}>Entendi</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
