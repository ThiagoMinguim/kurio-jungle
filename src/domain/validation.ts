export type FieldErrors = Record<string, string>;
export const normalizeName = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ");
export function nameError(value: string) {
  const name = normalizeName(value);
  if (name.length < 2 || name.length > 80)
    return "Use entre 2 e 80 caracteres.";
  if (!/^\p{L}[\p{L}\p{M}]*(?:[ '\u2019-]\p{L}[\p{L}\p{M}]*)*$/u.test(name))
    return "Use apenas letras, espaços, apóstrofo ou hífen. Números não são permitidos.";
}
export function emailError(value: string) {
  if (
    value.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    return "Informe um e-mail válido.";
}
export function passwordError(value: string) {
  if (
    value.length < 8 ||
    value.length > 128 ||
    !/[\p{L}]/u.test(value) ||
    !/\d/.test(value)
  )
    return "Use de 8 a 128 caracteres, incluindo letras e números.";
}
export function validAddress(address: string, network: string) {
  return network === "Solana"
    ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
    : ["Ethereum", "Polygon"].includes(network) &&
        /^0x[a-fA-F0-9]{40}$/.test(address) &&
        !/^0x0{40}$/i.test(address);
}
export function shortenAddress(address: string, network: string) {
  return validAddress(address, network)
    ? `${address.slice(0, 5)}…${address.slice(-5)}`
    : "Endereço inválido — edite a carteira";
}
export function quantityError(value: string, stock: number) {
  if (stock === 0) return "Edição esgotada.";
  if (!value) return "Informe a quantidade.";
  if (
    !/^[0-9]+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  )
    return "Informe um número inteiro maior que zero.";
  if (Number(value) > stock) return `Disponível: até ${stock} unidades.`;
}
export function collectorDetailsErrors(values: Record<string, string>) {
  const errors: FieldErrors = {};
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_.-]{1,39}$/u.test(values.username || ""))
    errors.username =
      "Use de 2 a 40 letras, números, pontos, hífens ou sublinhados.";
  const profileError = nameError(values.profileName || "");
  if (profileError) errors.profileName = profileError;
  if (
    values.secondaryAddress &&
    !/^([\p{L}\p{N}-]+\.)+(eth|xyz)$/u.test(values.secondaryAddress) &&
    !validAddress(values.secondaryAddress, values.network || "Ethereum")
  )
    errors.secondaryAddress =
      "Informe um endereço da rede ou um nome como colecionador.eth.";
  if (values.referralCode && !/^[A-Za-z0-9_-]{1,32}$/.test(values.referralCode))
    errors.referralCode = "Use até 32 letras, números, hífens ou sublinhados.";
  if (![".eth", ".xyz"].includes(values.ensSuffix))
    errors.ensSuffix = "Selecione um domínio disponível.";
  if ((values.notes || "").length > 500)
    errors.notes = "Use até 500 caracteres.";
  if (
    !["WalletConnect", "MetaMask", "Coinbase Wallet"].includes(values.provider)
  )
    errors.provider = "Selecione um tipo de carteira.";
  return errors;
}
export function validateForm(
  values: Record<string, string>,
  mode: "login" | "register" | "profile" | "password" | "wallet" | "checkout",
): FieldErrors {
  const errors: FieldErrors = {};
  const add = (key: string, error?: string) => {
    if (error) errors[key] = error;
  };
  if (["register", "profile", "checkout"].includes(mode))
    add("name", nameError(values.name || ""));
  if (["login", "register", "profile", "checkout"].includes(mode))
    add("email", emailError(values.email || ""));
  if (mode === "login" && !(values.password || ""))
    add("password", "Informe sua senha.");
  if (mode === "register") {
    add("password", passwordError(values.password || ""));
    if (values.confirmPassword !== values.password)
      add("confirmPassword", "As senhas não conferem.");
  }
  if (
    mode === "password" ||
    (mode === "profile" &&
      [
        values.currentPassword,
        values.newPassword,
        values.confirmNewPassword,
      ].some(Boolean))
  ) {
    if (!values.currentPassword)
      add("currentPassword", "Informe sua senha atual.");
    add("newPassword", passwordError(values.newPassword || ""));
    if (values.confirmNewPassword !== values.newPassword)
      add("confirmNewPassword", "As senhas não conferem.");
    if (values.newPassword === values.currentPassword)
      add("newPassword", "Escolha uma senha diferente da atual.");
  }
  if (mode === "wallet") {
    if ((values.name || "").trim().length < 2 || values.name.length > 40)
      add("name", "Use um nome de 2 a 40 caracteres.");
    if (!validAddress((values.address || "").trim(), values.network))
      add(
        "address",
        "Informe um endereço fictício válido para a rede escolhida.",
      );
  }
  if (mode === "profile" || mode === "wallet") {
    if (
      values.username &&
      !/^[\p{L}\p{N}][\p{L}\p{N}_.-]{1,39}$/u.test(values.username)
    )
      add(
        "username",
        "Use de 2 a 40 letras, números, pontos, hífens ou sublinhados.",
      );
    if (
      values.ensName &&
      !/^[\p{L}\p{N}][\p{L}\p{N}-]{0,62}$/u.test(values.ensName)
    )
      add("ensName", "Use até 63 letras, números ou hífens para o nome ENS.");
    if (values.ensSuffix && ![".eth", ".xyz"].includes(values.ensSuffix))
      add("ensSuffix", "Selecione um domínio disponível.");
    if ((values.walletAlias || "").length > 40)
      add("walletAlias", "Use até 40 caracteres.");
  }
  if (mode === "wallet") {
    for (const key of ["displayName", "profileName"])
      if (values[key]) add(key, nameError(values[key]));
    if (values.email) add("email", emailError(values.email));
    if (
      values.secondaryAddress &&
      !/^([\p{L}\p{N}-]+\.)+(eth|xyz)$/u.test(values.secondaryAddress) &&
      !validAddress(values.secondaryAddress, values.network)
    )
      add(
        "secondaryAddress",
        "Informe um endereço da rede ou um nome ENS válido.",
      );
    if (
      values.referralCode &&
      !/^[A-Za-z0-9_-]{1,32}$/.test(values.referralCode)
    )
      add("referralCode", "Use até 32 letras, números, hífens ou sublinhados.");
    if (
      values.provider &&
      !["WalletConnect", "MetaMask", "Coinbase Wallet"].includes(
        values.provider,
      )
    )
      add("provider", "Selecione um tipo de carteira válido.");
  }
  if (mode === "checkout" && "username" in values)
    Object.assign(errors, collectorDetailsErrors(values));
  return errors;
}
