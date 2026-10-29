import { ValidatedForm } from "../components/validated-form";
import { useEffect, useRef, useState } from "react";
import { Copy, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { Tooltip } from "../components/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Link, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../app/session";
import { api, errorData, post } from "../lib/api";
import { queryClient } from "../lib/query";
import type { User, Wallet } from "../domain/types";
import { Button } from "../components/ui/button";
import { ErrorBox, Field, Select, Skeleton } from "../components/shared";
import { PasswordField } from "../components/password-field";
import { AccountNavigation } from "../components/account-navigation";
import "./account.css";
import { useProfile, useWallets } from "./data";
function AvatarPicker({ initialAvatar }: { initialAvatar: string }) {
  const [avatar, setAvatar] = useState(initialAvatar),
    [choosing, setChoosing] = useState(false);
  return (
    <div className="profile-avatar">
      <span>Avatar</span>
      <div>
        {avatar ? (
          <img
            className="avatar-preview"
            src={avatar}
            width="50"
            height="50"
            alt="Prévia do avatar"
          />
        ) : (
          <span className="avatar-placeholder">
            <ImageIcon size={22} />
          </span>
        )}
        <input type="hidden" name="avatar" value={avatar} />
        <Button type="button" onClick={() => setChoosing(true)}>
          Alterar
        </Button>
        <button
          type="button"
          className="avatar-remove"
          onClick={() => setAvatar("")}
        >
          Remover
        </button>
      </div>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent>
          <DialogTitle>Escolher avatar</DialogTitle>
          <DialogDescription>
            A prévia muda ao selecionar; salvar o perfil confirma a alteração.
          </DialogDescription>
          <div className="avatar-options">
            {["emerald", "sage", "ivory", "golden"].map((name) => (
              <button
                type="button"
                key={name}
                aria-label={`Usar avatar ${name}`}
                aria-pressed={avatar === `/art/${name}.webp`}
                onClick={() => {
                  setAvatar(`/art/${name}.webp`);
                  setChoosing(false);
                }}
              >
                <img src={`/art/${name}.webp`} alt="" width="80" height="80" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function Profile() {
  const profile = useProfile(),
    { refresh } = useAuth(),
    [notice, setNotice] = useState(""),
    [revision, setRevision] = useState(0);
  const mutation = useMutation({
    mutationFn: (values: Record<string, FormDataEntryValue>) =>
      api.patch<User>("/profile", values),
    onSuccess: async (_data, values) => {
      await queryClient.invalidateQueries({ queryKey: ["private"] });
      await refresh();
      setNotice(
        values.newPassword
          ? "Perfil e senha atualizados."
          : "Perfil atualizado.",
      );
      setRevision((value) => value + 1);
    },
  });
  if (profile.isPending) return <Skeleton />;
  if (!profile.data)
    return (
      <ErrorBox error={profile.error} retry={() => void profile.refetch()} />
    );
  const fields = mutation.error ? errorData(mutation.error).fields : {},
    user = profile.data;
  return (
    <>
      <h1 className="sr-only">Dados do colecionador</h1>
      <div className="account-grid">
        <AccountNavigation />
        <section className="account-content">
          <h2>Perfil do colecionador</h2>
          {notice && (
            <p className="success" role="status">
              {notice}
            </p>
          )}
          <ValidatedForm
            mode="profile"
            className="profile-form"
            key={`${user.id}-${revision}`}
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(
                Object.fromEntries(new FormData(event.currentTarget)),
              );
            }}
          >
            <div className="profile-fields">
              <Field
                label="Nome de exibição"
                name="name"
                defaultValue={user.name}
                required
                minLength={2}
                error={fields?.name}
              />
              <Field
                label="Nome de usuário"
                name="username"
                defaultValue={user.username}
                maxLength={40}
                error={fields?.username}
              />
              <Field
                label="E-mail"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                error={fields?.email}
              />
              <div className="profile-ens">
                <span className="ens-caption">Nome ENS</span>
                <div>
                  <Select
                    label="Domínio ENS"
                    id="profile-ens-suffix"
                    name="ensSuffix"
                    defaultValue={user.ensSuffix || ".eth"}
                  >
                    <option>.eth</option>
                    <option>.xyz</option>
                  </Select>
                  <Field
                    label="Nome ENS"
                    id="profile-ens-name"
                    name="ensName"
                    defaultValue={user.ensName}
                    maxLength={63}
                    error={fields?.ensName}
                  />
                </div>
              </div>
              <Field
                label="Apelido da carteira"
                name="walletAlias"
                defaultValue={user.walletAlias}
                maxLength={40}
                error={fields?.walletAlias}
              />
              <AvatarPicker initialAvatar={user.avatar} />
            </div>
            <section className="account-password">
              <h2>Alterar senha</h2>
              <p className="sr-only">
                Campos opcionais. Preencha os três para alterar sua senha.
              </p>
              <div className="password-grid">
                <PasswordField
                  label="Senha atual"
                  name="currentPassword"
                  autoComplete="current-password"
                  error={fields?.currentPassword}
                />
                <PasswordField
                  label="Nova senha"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  error={fields?.newPassword}
                />
                <PasswordField
                  label="Confirmar nova senha"
                  name="confirmNewPassword"
                  autoComplete="new-password"
                  error={fields?.confirmNewPassword}
                />
              </div>
            </section>
            <ErrorBox error={mutation.error} />
            <Button
              type="submit"
              aria-label="Salvar perfil"
              disabled={mutation.isPending}
            >
              Salvar
            </Button>
          </ValidatedForm>
        </section>
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
  useEffect(() => {
    if (editing)
      document
        .querySelector<HTMLInputElement>('.wallet-form input[name="name"]')
        ?.focus();
  }, [editing]);
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
      <h1 className="sr-only" ref={heading} tabIndex={-1}>
        Minhas carteiras<span className="accent">.</span>
      </h1>

      <div className="account-grid">
        <AccountNavigation />
        <div className="account-content wallets-content">
          {notice && (
            <p role="status" className="success">
              {notice}
            </p>
          )}
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
          {(editing || !query.data || query.data.length < 2) && (
            <ValidatedForm
              mode="wallet"
              key={editing?.id || "new"}
              className="wallet-form"
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
              <h2>
                {editing
                  ? "Editar carteira"
                  : query.data?.length
                    ? "Carteira secundária"
                    : "Carteira principal"}
              </h2>
              <p className="wallet-description">
                Estas carteiras ficam disponíveis no pagamento simulado. Use
                somente dados fictícios.
              </p>
              <div className="wallet-form-fields">
                <Field
                  label="Nome de exibição"
                  name="displayName"
                  defaultValue={editing?.displayName}
                  error={fields?.displayName}
                />

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
                  label="Nome do perfil"
                  name="profileName"
                  defaultValue={editing?.profileName}
                  error={fields?.profileName}
                />
                <Field
                  label="Endereço fictício"
                  name="address"
                  defaultValue={editing?.address}
                  required
                  placeholder="0x2222222222222222222222222222222222222222"
                  error={fields?.address}
                />
                <Field
                  label="ENS ou carteira secundária"
                  name="secondaryAddress"
                  defaultValue={editing?.secondaryAddress}
                  placeholder="ENS ou carteira secundária (opcional)"
                  error={fields?.secondaryAddress}
                />
                <Select
                  label="Tipo de carteira"
                  id="wallet-provider"
                  name="provider"
                  defaultValue={editing?.provider || "WalletConnect"}
                >
                  <option>WalletConnect</option>
                  <option>MetaMask</option>
                  <option>Coinbase Wallet</option>
                </Select>
                <Field
                  label="Código de indicação"
                  name="referralCode"
                  defaultValue={editing?.referralCode}
                  maxLength={32}
                  error={fields?.referralCode}
                />
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  defaultValue={editing?.email}
                  error={fields?.email}
                />
                <div className="profile-ens">
                  <span className="ens-caption">Nome ENS</span>
                  <div>
                    <Select
                      label="Domínio ENS"
                      id="wallet-ens-suffix"
                      name="ensSuffix"
                      defaultValue={editing?.ensSuffix || ".eth"}
                    >
                      <option>.eth</option>
                      <option>.xyz</option>
                    </Select>
                    <Field
                      label="Nome ENS"
                      id="wallet-ens-name"
                      name="ensName"
                      defaultValue={editing?.ensName}
                      maxLength={63}
                      error={fields?.ensName}
                    />
                  </div>
                </div>
              </div>
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
          <section
            className="registered-wallets"
            aria-label="Carteiras cadastradas"
          >
            <h2>Carteiras cadastradas</h2>{" "}
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
          </section>
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
