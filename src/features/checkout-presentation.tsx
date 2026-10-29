import { type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link } from "@tanstack/react-router";
import { MoreVertical, Wallet } from "lucide-react";
import type {
  CollectorDetails,
  Quote,
  Wallet as RegisteredWallet,
} from "../domain/types";
import { walletProviders } from "../domain/types";
import { eth } from "../domain/money";
import { shortenAddress } from "../domain/validation";
import { Field, Select } from "../components/shared";
import { useFieldError } from "../components/validated-form";

export function CollectorFields({
  name,
  email,
  onName,
  onEmail,
  details,
  onDetails,
  address,
  networkField,
  walletField,
  mobile = false,
}: {
  name: string;
  email: string;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  details: CollectorDetails;
  onDetails: Dispatch<SetStateAction<CollectorDetails>>;
  address: string;
  networkField?: ReactNode;
  walletField?: ReactNode;
  mobile?: boolean;
}) {
  const notesError = useFieldError("notes");
  const update = (key: keyof CollectorDetails, value: string) =>
    onDetails((old) => ({ ...old, [key]: value }));
  return (
    <div className="collector-fields">
      <Field
        label="Nome completo"
        name="name"
        required
        minLength={2}
        maxLength={80}
        value={name}
        onChange={(e) => onName(e.target.value)}
        autoComplete="name"
      />
      <Field
        label="Nome de usuário"
        name="username"
        required
        maxLength={40}
        value={details.username}
        onChange={(e) => update("username", e.target.value)}
        autoComplete="username"
      />
      {networkField}
      <Field
        label="Nome do perfil"
        name="profileName"
        required
        maxLength={80}
        value={details.profileName}
        onChange={(e) => update("profileName", e.target.value)}
      />
      {!mobile &&
        (walletField || (
          <Field
            label="Endereço da carteira"
            name="address"
            required
            value={address}
            readOnly
            placeholder="Endereço 0x da carteira"
          />
        ))}
      <Field
        label="ENS ou carteira secundária (opcional)"
        name="secondaryAddress"
        maxLength={100}
        value={details.secondaryAddress}
        onChange={(e) => update("secondaryAddress", e.target.value)}
        placeholder="ENS ou carteira secundária (opcional)"
      />
      {!mobile && (
        <Select
          label="Tipo de carteira"
          id="wallet-provider-select"
          value={details.provider}
          required
          onChange={(e) => update("provider", e.target.value)}
        >
          {walletProviders.map((provider) => (
            <option key={provider}>{provider}</option>
          ))}
        </Select>
      )}
      <Field
        label="Código de indicação (opcional)"
        name="referralCode"
        maxLength={32}
        value={details.referralCode}
        onChange={(e) => update("referralCode", e.target.value)}
      />
      <Field
        label="E-mail do recibo"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => onEmail(e.target.value)}
        autoComplete="email"
      />
      <Select
        label="Nome ENS"
        id="ens-suffix"
        name="ensSuffix"
        className="ens-suffix"
        value={details.ensSuffix}
        onChange={(e) => update("ensSuffix", e.target.value)}
      >
        <option>.eth</option>
        <option>.xyz</option>
      </Select>
      {!mobile && (
        <Link
          className="other-wallet-link"
          to="/wallets"
          search={{ returnTo: "/checkout" }}
        >
          <span aria-hidden="true">○</span> Usar outra carteira?
        </Link>
      )}
      <div className="field collector-notes">
        <label htmlFor="collector-notes">
          Observação do colecionador (opcional)
        </label>
        <textarea
          id="collector-notes"
          name="notes"
          maxLength={500}
          value={details.notes}
          onChange={(e) => update("notes", e.target.value)}
          aria-invalid={!!notesError}
          aria-describedby={notesError ? "collector-notes-error" : undefined}
        />
        {notesError && (
          <span className="field-error" id="collector-notes-error">
            {notesError}
          </span>
        )}
      </div>
    </div>
  );
}

export function WalletChoices({
  wallets,
  selectedId,
  onSelect,
  network,
  onNetwork,
}: {
  wallets: RegisteredWallet[];
  selectedId?: string;
  onSelect: (wallet: RegisteredWallet) => void;
  network: string;
  onNetwork: (value: string) => void;
}) {
  return (
    <section className="mobile-wallets">
      <div className="wallet-selection-heading">
        <h2>Carteira conectada</h2>
        <Link to="/wallets" search={{ returnTo: "/checkout" }}>
          Trocar carteira
        </Link>
      </div>
      <fieldset aria-label="Carteira cadastrada" className="wallet-choice-list">
        {wallets.map((wallet) => (
          <div
            className={`wallet-choice ${selectedId === wallet.id ? "selected" : ""}`}
            key={wallet.id}
          >
            <input
              type="radio"
              name="walletId"
              id={`pay-${wallet.id}`}
              value={wallet.id}
              checked={selectedId === wallet.id}
              onChange={() => onSelect(wallet)}
            />
            <label htmlFor={`pay-${wallet.id}`}>
              <strong>{wallet.name}</strong>
              <span>{shortenAddress(wallet.address, wallet.network)}</span>
              {selectedId !== wallet.id && <small>Rede {wallet.network}</small>}
            </label>
            {selectedId === wallet.id && (
              <div className="mobile-wallet-network">
                <span aria-hidden="true">Rede</span>
                <Select
                  label="Rede para pagamento"
                  id="checkout-network"
                  name="network"
                  value={network}
                  onChange={(e) => onNetwork(e.target.value)}
                >
                  <option>Ethereum</option>
                  <option>Polygon</option>
                  <option>Solana</option>
                </Select>
              </div>
            )}
            <Link
              to="/wallets"
              search={{ returnTo: "/checkout" }}
              aria-label={`Gerenciar ${wallet.name}`}
              className="wallet-choice-menu"
            >
              <MoreVertical size={18} />
            </Link>
          </div>
        ))}
      </fieldset>
      {!wallets.length && (
        <p className="notice">Cadastre uma carteira fictícia para continuar.</p>
      )}
    </section>
  );
}

export function ProviderChoices({
  value,
  onChange,
}: {
  value: CollectorDetails["provider"];
  onChange: (value: CollectorDetails["provider"]) => void;
}) {
  return (
    <fieldset className="provider-choices">
      <legend>Carteira e rede</legend>
      {walletProviders.map((provider, index) => (
        <label
          className={`provider-choice ${value === provider ? "selected" : ""}`}
          key={provider}
        >
          <span className="provider-symbol" aria-hidden="true">
            {index === 2 ? <Wallet size={21} /> : index === 0 ? "W" : "M"}
          </span>
          <span>{provider}</span>
          <input
            type="radio"
            name="provider"
            value={provider}
            checked={value === provider}
            onChange={() => onChange(provider)}
          />
        </label>
      ))}
    </fieldset>
  );
}

export function QuoteItems({
  quote,
  receipt = false,
  labeled = false,
}: {
  quote: Quote;
  receipt?: boolean;
  labeled?: boolean;
}) {
  return (
    <div
      className={`nft-order-table ${receipt ? "receipt-table" : ""}`}
      role="table"
      aria-label="NFTs do pedido"
    >
      <div className="nft-order-columns" role="row">
        <span role="columnheader" aria-colspan={receipt ? undefined : 2}>
          NFTs
        </span>
        {receipt && <span role="columnheader">Edições</span>}
        <span role="columnheader">Subtotal</span>
      </div>
      {quote.lines.map((line) => (
        <div
          className="nft-order-row"
          role="row"
          key={`${line.nftId}:${line.editionId}`}
        >
          <div className="nft-order-identity" role="cell">
            <img src={line.image} alt="" width="70" height="70" />
            <div>
              <strong>{line.name}</strong>
              <small>
                ID do token: #
                {(line.name.match(/#(\d+)/)?.[1] || line.nftId).padStart(
                  4,
                  "0",
                )}
              </small>
              {labeled && <small>Edição: {line.edition}</small>}
            </div>
          </div>
          <span
            className="nft-order-quantity"
            role="cell"
            aria-label={`Quantidade: ${line.quantity}. Edição: ${line.edition}`}
          >
            {labeled ? `Quantidade: ${line.quantity}` : `(× ${line.quantity})`}
          </span>
          <strong className="nft-order-subtotal" role="cell">
            {eth(line.total)}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function ReviewData({
  name,
  email,
  wallet,
  network,
  details,
}: {
  name: string;
  email: string;
  wallet?: RegisteredWallet;
  network: string;
  details?: CollectorDetails;
}) {
  return (
    <dl className="review-data">
      <div>
        <dt>Nome completo</dt>
        <dd>{name}</dd>
      </div>
      <div>
        <dt>E-mail do recibo</dt>
        <dd>{email}</dd>
      </div>
      <div>
        <dt>Carteira cadastrada</dt>
        <dd>{wallet?.name || "Não informada"}</dd>
      </div>
      <div>
        <dt>Endereço da carteira</dt>
        <dd className="address-value">{wallet?.address || "Não informado"}</dd>
      </div>
      <div>
        <dt>Rede para pagamento</dt>
        <dd>{network}</dd>
      </div>
      {details && (
        <>
          <div>
            <dt>Nome de usuário</dt>
            <dd>{details.username}</dd>
          </div>
          <div>
            <dt>Nome do perfil</dt>
            <dd>{details.profileName}</dd>
          </div>
          <div>
            <dt>Tipo de carteira</dt>
            <dd>{details.provider}</dd>
          </div>
          <div>
            <dt>Nome ENS</dt>
            <dd>{details.ensSuffix}</dd>
          </div>
          <div>
            <dt>ENS ou carteira secundária</dt>
            <dd>{details.secondaryAddress || "Não informado"}</dd>
          </div>
          <div>
            <dt>Código de indicação</dt>
            <dd>{details.referralCode || "Não informado"}</dd>
          </div>
          <div className="review-notes">
            <dt>Observação do colecionador</dt>
            <dd>{details.notes || "Não informada"}</dd>
          </div>
        </>
      )}
    </dl>
  );
}

export function ThankYouMark() {
  return (
    <img
      className="thank-you-mark"
      src="/art/thank-you.svg"
      width="80"
      height="80"
      alt=""
      aria-hidden="true"
    />
  );
}
