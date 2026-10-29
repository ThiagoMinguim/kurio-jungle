import { ValidatedForm } from "../components/validated-form";
import { useRef, useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "../components/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../app/session";
import { api, errorData, post } from "../lib/api";
import { queryClient } from "../lib/query";
import type { User, Wallet } from "../domain/types";
import { Button } from "../components/ui/button";
import { ErrorBox, Field, Select, Skeleton } from "../components/shared";
import { useProfile, useWallets } from "./data";
export function Login({ register = false }: { register?: boolean }) {
  const { login, session, ready } = useAuth(),
    navigate = useNavigate(),
    search = useSearch({ strict: false }) as { next?: string },
    [failure, setFailure] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const next =
    search.next?.startsWith("/") && !search.next.startsWith("//")
      ? search.next
      : "/";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    const fields = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    try {
      if (register && fields.password !== fields.confirmPassword)
        throw new Error("As senhas não conferem.");
      await login(fields, register);
      void navigate({ href: next });
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  }
  const errors = failure ? errorData(failure).fields : {};
  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">BEM-VINDO À KURIO</span>
        <h1>
          Sua próxima
          <br />
          história começa
          <br />
          <em>aqui.</em>
        </h1>
        <p>Uma comunidade para quem vê arte além do óbvio.</p>
        <img
          src="/art/emerald.webp"
          width="380"
          height="380"
          alt="Arte Emerald Ape, coleção Kurio"
        />
      </div>
      <div className="form-panel auth-form">
        <span className="eyebrow">COLECIONE NOVAS POSSIBILIDADES</span>
        <h2>{register ? "Crie sua conta" : "Que bom ter você de volta."}</h2>
        {ready && session ? (
          <>
            <p>Você já está conectado como {session.user.name}.</p>
            <Button asChild>
              <Link to="/profile">Abrir perfil</Link>
            </Button>
          </>
        ) : (
          <ValidatedForm
            mode={register ? "register" : "login"}
            onSubmit={(e) => void submit(e)}
          >
            {register && (
              <Field
                label="Nome"
                name="name"
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
              required
              autoComplete="username"
              error={errors?.email}
            />
            <Field
              label="Senha"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={register ? "new-password" : "current-password"}
              error={errors?.password}
            />
            {register && (
              <Field
                label="Confirmar senha"
                name="confirmPassword"
                error={errors?.confirmPassword}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            )}
            <ErrorBox error={failure} />
            <Button type="submit" className="full-width" disabled={busy}>
              {busy ? "Aguarde…" : register ? "Criar conta fictícia" : "Entrar"}
            </Button>
          </ValidatedForm>
        )}
        <p>
          {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <Link
            to={register ? "/login" : "/register"}
            search={{ next }}
            className="text-link"
          >
            {register ? "Entre aqui" : "Cadastre-se"}
          </Link>
        </p>
        <div className="demo-credentials">
          <strong>Acesso demonstrativo</strong>
          <p>
            alex@demo.test ou bia@demo.test
            <br />
            Senha: Demo123!
          </p>
          <small>Use apenas dados fictícios neste ambiente.</small>
        </div>
      </div>
    </section>
  );
}
function AvatarPicker({ initialAvatar }: { initialAvatar: string }) {
  const [avatar, setAvatar] = useState(initialAvatar);
  return (
    <>
      <img
        className="avatar-preview"
        src={avatar}
        width="96"
        height="96"
        alt="Prévia do avatar"
      />
      <Select
        label="Avatar"
        id="avatar"
        name="avatar"
        value={avatar}
        onChange={(event) => setAvatar(event.target.value)}
      >
        {["emerald", "sage", "ivory", "golden"].map((name) => (
          <option key={name} value={`/art/${name}.webp`}>
            {name}
          </option>
        ))}
      </Select>
      <p className="field-hint">
        Prévia do avatar. Salve o perfil para confirmar a alteração.
      </p>
    </>
  );
}
export function Profile() {
  const profile = useProfile(),
    { refresh } = useAuth(),
    [notice, setNotice] = useState(""),
    mutation = useMutation({
      mutationFn: (values: Record<string, FormDataEntryValue>) =>
        api.patch<User>("/profile", values),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["private"] });
        await refresh();
        setNotice("Perfil atualizado.");
      },
    }),
    password = useMutation({
      mutationFn: (values: Record<string, FormDataEntryValue>) =>
        post("/password", values),
      onSuccess: () =>
        setNotice("Senha atualizada. Use a nova senha no próximo login."),
    });
  if (profile.isPending) return <Skeleton />;
  if (!profile.data)
    return (
      <ErrorBox error={profile.error} retry={() => void profile.refetch()} />
    );
  const fields = mutation.error ? errorData(mutation.error).fields : {},
    passwordFields = password.error ? errorData(password.error).fields : {};
  return (
    <>
      <span className="eyebrow">MEU PERFIL</span>
      <h1>
        Dados do colecionador<span className="accent">.</span>
      </h1>
      <div className="account-grid">
        <nav className="account-nav" aria-label="Conta">
          <Link to="/profile">Dados pessoais</Link>
          <Link to="/wallets">Carteiras</Link>
          <Link to="/favorites">Favoritos</Link>
        </nav>
        <div>
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          <ValidatedForm
            mode="profile"
            className="form-panel"
            key={`${profile.data.name}-${profile.data.avatar}`}
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(
                Object.fromEntries(new FormData(e.currentTarget)),
              );
            }}
          >
            <h2>Seu perfil</h2>
            <AvatarPicker initialAvatar={profile.data.avatar} />
            <Field
              label="Nome"
              name="name"
              defaultValue={profile.data.name}
              required
              minLength={2}
              error={fields?.name}
            />
            <Field
              label="E-mail"
              name="email"
              type="email"
              defaultValue={profile.data.email}
              required
              error={fields?.email}
            />
            <ErrorBox error={mutation.error} />
            <Button type="submit" disabled={mutation.isPending}>
              Salvar perfil
            </Button>
          </ValidatedForm>
          <ValidatedForm
            mode="password"
            className="form-panel"
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              password.mutate(Object.fromEntries(new FormData(f)), {
                onSuccess: () => f.reset(),
              });
            }}
          >
            <h2>Alterar senha</h2>
            <Field
              label="Senha atual"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              error={passwordFields?.currentPassword}
            />
            <Field
              label="Nova senha"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              error={passwordFields?.newPassword}
            />
            <Field
              label="Confirmar nova senha"
              name="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            <ErrorBox error={password.error} />
            <Button
              type="submit"
              variant="outline"
              disabled={password.isPending}
            >
              Atualizar senha
            </Button>
          </ValidatedForm>
        </div>
      </div>
    </>
  );
}
export function Wallets() {
  const query = useWallets(),
    search = useSearch({ strict: false }) as { returnTo?: string },
    heading = useRef<HTMLHeadingElement>(null),
    deleteTrigger = useRef<HTMLButtonElement | null>(null),
    [deleting, setDeleting] = useState<Wallet | null>(null),
    [editing, setEditing] = useState<Wallet | null>(null),
    [notice, setNotice] = useState(""),
    mutation = useMutation({
      mutationFn: (input: unknown) => post<Wallet[]>("/wallets", input),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["private"] });
        setEditing(null);
        setNotice("Carteira salva.");
      },
    }),
    removal = useMutation({
      mutationFn: (id: string) =>
        api.delete<Wallet[]>(`/wallets/${encodeURIComponent(id)}`),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["private"] });
        if (editing?.id === deleting?.id) setEditing(null);
        setDeleting(null);
        setNotice("Carteira excluída.");
      },
    });
  async function copyAddress(wallet: Wallet) {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setNotice("Endereço copiado.");
    } catch {
      setNotice(
        "Não foi possível copiar automaticamente. Selecione o endereço para copiar.",
      );
    }
  }
  const fields = mutation.error ? errorData(mutation.error).fields : {};
  return (
    <>
      <span className="eyebrow">MEU PERFIL</span>
      <h1 ref={heading} tabIndex={-1}>
        Minhas carteiras<span className="accent">.</span>
      </h1>
      <p className="muted">
        Até duas carteiras fictícias. Nenhuma extensão ou saldo real é
        consultado.
      </p>
      <div className="account-grid">
        <nav className="account-nav" aria-label="Conta">
          <Link to="/profile">Dados pessoais</Link>
          <Link to="/wallets">Carteiras</Link>
          <Link to="/favorites">Favoritos</Link>
        </nav>
        <div>
          {notice && (
            <p role="status" className="success">
              {notice}
            </p>
          )}
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
          {query.isPending ? (
            <Skeleton />
          ) : (
            query.data?.map((w) => (
              <article className="wallet-card" key={w.id}>
                <span className="eyebrow">
                  {w.primary ? "CARTEIRA PRINCIPAL" : "CARTEIRA SECUNDÁRIA"} /{" "}
                  {w.network}
                </span>
                <div className="wallet-card-heading">
                  <h2>{w.name}</h2>
                  <div className="wallet-actions">
                    <Tooltip label={`Editar ${w.name}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Editar ${w.name}`}
                        disabled={mutation.isPending || removal.isPending}
                        onClick={() => {
                          setEditing(w);
                          mutation.reset();
                          setNotice("");
                        }}
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </Button>
                    </Tooltip>
                    <Tooltip label={`Excluir ${w.name}`}>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ${w.name}`}
                        disabled={mutation.isPending || removal.isPending}
                        onClick={(event) => {
                          deleteTrigger.current = event.currentTarget;
                          setDeleting(w);
                          removal.reset();
                        }}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div className="wallet-address-row">
                  <code className="wallet-address">{w.address}</code>
                  <Tooltip label={`Copiar endereço de ${w.name}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Copiar endereço de ${w.name}`}
                      onClick={() => void copyAddress(w)}
                    >
                      <Copy size={18} aria-hidden="true" />
                    </Button>
                  </Tooltip>
                </div>
              </article>
            ))
          )}
          {(editing || !query.data || query.data.length < 2) && (
            <ValidatedForm
              mode="wallet"
              key={editing?.id || "new"}
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                const f = Object.fromEntries(new FormData(e.currentTarget));
                mutation.mutate({
                  ...f,
                  id: editing?.id || "",
                  primary: f.primary === "on",
                });
              }}
            >
              <h2>{editing ? "Editar carteira" : "Adicionar carteira"}</h2>
              <Field
                label="Nome da carteira"
                name="name"
                defaultValue={editing?.name}
                required
              />
              <Select
                label="Rede da carteira"
                id="wallet-network"
                name="network"
                defaultValue={editing?.network || "Ethereum"}
              >
                <option>Ethereum</option>
                <option>Polygon</option>
                <option>Solana</option>
              </Select>
              <Field
                label="Endereço fictício"
                name="address"
                defaultValue={editing?.address}
                required
                placeholder="0x2222222222222222222222222222222222222222"
                error={fields?.address}
              />
              <label className="checkbox-label">
                <input
                  name="primary"
                  type="checkbox"
                  defaultChecked={editing?.primary}
                />{" "}
                Definir como principal
              </label>
              <ErrorBox error={mutation.error} />
              <div className="button-row">
                <Button type="submit" disabled={mutation.isPending}>
                  Salvar carteira
                </Button>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </ValidatedForm>
          )}
          {search.returnTo === "/checkout" && (
            <Link to="/checkout" className="text-link">
              Voltar para pagamento →
            </Link>
          )}
          <Dialog
            open={!!deleting}
            onOpenChange={(open) => {
              if (!open && !removal.isPending) setDeleting(null);
            }}
          >
            <DialogContent
              role="alertdialog"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                (deleteTrigger.current?.isConnected
                  ? deleteTrigger.current
                  : heading.current
                )?.focus();
              }}
            >
              <DialogTitle>Excluir carteira?</DialogTitle>
              <DialogDescription>
                {deleting?.name}. Você poderá cadastrá-la novamente.{" "}
                {deleting?.primary && query.data && query.data.length > 1
                  ? "A carteira restante será definida como principal."
                  : query.data?.length === 1
                    ? "Para comprar novamente, cadastre outra carteira."
                    : ""}
              </DialogDescription>
              <ErrorBox error={removal.error} />
              <div className="button-row">
                <Button
                  variant="outline"
                  disabled={removal.isPending}
                  onClick={() => setDeleting(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={removal.isPending}
                  onClick={() => {
                    if (deleting) removal.mutate(deleting.id);
                  }}
                >
                  {removal.isPending ? "Excluindo…" : "Excluir carteira"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
}
