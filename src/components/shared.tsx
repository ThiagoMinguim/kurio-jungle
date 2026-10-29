import { Tooltip } from "./tooltip";
import { useFieldError } from "./validated-form";
import type { ReactNode, InputHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Heart } from "lucide-react";
import { Button } from "./ui/button";
import { errorData } from "../lib/api";
import type { Nft } from "../domain/types";
import { eth, toWei } from "../domain/money";
import { useAuth } from "../app/session";
import { useFavoriteMutation, useFavorites } from "../features/data";
export function Field({
  label,
  error,
  errorRole,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  errorRole?: "alert" | "status";
}) {
  const id = props.id || props.name;
  const localError = useFieldError(props.name);
  error = localError || error;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : props["aria-describedby"]}
      />
      {error && (
        <span id={`${id}-error`} className="field-error" role={errorRole}>
          {error}
        </span>
      )}
    </div>
  );
}
export function Select({
  label,
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        {children}
      </select>
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div role="alert" className="error-box">
      {errorData(error).message}
      {retry && (
        <Button variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function Skeleton({ count = 1 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando conteúdo"
      className={count > 1 ? "nft-grid" : ""}
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="eyebrow">UM NOVO COMEÇO</span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Favorite({
  nft,
  labeled = false,
}: {
  nft: Nft;
  labeled?: boolean;
}) {
  const { session } = useAuth();
  return session ? (
    <AuthenticatedFavorite nft={nft} labeled={labeled} />
  ) : (
    <Tooltip label="Adicionar aos favoritos" className="favorite-tip">
      <Button
        variant="ghost"
        size="icon"
        className={`favorite ${labeled ? "favorite-labeled" : ""}`}
        aria-label={`${labeled ? "Favoritar" : "Adicionar aos favoritos"}: ${nft.name}`}
        asChild
      >
        <Link to="/login" search={{ next: location.pathname }}>
          <Heart aria-hidden="true" />
          {labeled && <span>Favoritar</span>}
        </Link>
      </Button>
    </Tooltip>
  );
}
function AuthenticatedFavorite({
  nft,
  labeled = false,
}: {
  nft: Nft;
  labeled?: boolean;
}) {
  const favorites = useFavorites(),
    mutation = useFavoriteMutation(),
    favorite = favorites.data?.includes(nft.id) || false;
  return (
    <>
      <Tooltip
        label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className="favorite-tip"
      >
        <Button
          variant="ghost"
          size="icon"
          className={`favorite ${labeled ? "favorite-labeled" : ""}`}
          aria-label={`${labeled ? (favorite ? "Favoritado, remover dos favoritos" : "Favoritar") : favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}: ${nft.name}`}
          aria-pressed={favorite}
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({ nftId: nft.id, favorite: !favorite })
          }
        >
          <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} />
          {labeled && <span>{favorite ? "Favoritado" : "Favoritar"}</span>}
        </Button>
      </Tooltip>
      <ErrorBox error={mutation.error} />
    </>
  );
}
export function NftCard({
  nft,
  priority = false,
}: {
  nft: Nft;
  priority?: boolean;
}) {
  return (
    <article className="nft-card">
      <div className="art-wrap">
        <Link
          to="/nft/$nftId"
          params={{ nftId: nft.id }}
          aria-label={`Ver ${nft.name}`}
        >
          <img
            src={nft.image}
            srcSet={
              nft.image === "/art/emerald.webp"
                ? "/art/emerald-640.webp 640w, /art/emerald.webp 900w"
                : undefined
            }
            sizes="(max-width: 640px) calc((100vw - 60px) / 2), (max-width: 960px) 30vw, 270px"
            alt={`Retrato de ${nft.name}`}
            width="640"
            height="640"
            loading={priority ? "eager" : "lazy"}
          />
        </Link>
        <Favorite nft={nft} />
        {nft.badge && <span className="nft-badge">{nft.badge}</span>}
        <span className="network-tag">{nft.network}</span>
      </div>
      <div className="card-info">
        <span>
          {nft.creator} <span aria-label="Criador verificado">✦</span>
        </span>
        <Link to="/nft/$nftId" params={{ nftId: nft.id }}>
          <h3>{nft.name}</h3>
        </Link>
        <div className="card-bottom">
          <div>
            <small>Preço atual</small>
            <strong>{eth(nft.editions[0].price)}</strong>
            {nft.compareAtPrice &&
              toWei(nft.compareAtPrice) > toWei(nft.editions[0].price) && (
                <del>{eth(nft.compareAtPrice)}</del>
              )}
          </div>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Explorar ${nft.name}`}
          >
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
