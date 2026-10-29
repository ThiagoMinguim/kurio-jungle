import { recoverMockConnection, waitForMockRecovery } from "./mock-connection";
import type { InternalAxiosRequestConfig } from "axios";
import { isNft, isCatalog, InvalidResponseError } from "../domain/contracts";
import axios from "axios";
import type { ApiError } from "../domain/types";
const guestKey = "kurio.guest";
export const guestId = localStorage.getItem(guestKey) || crypto.randomUUID();
localStorage.setItem(guestKey, guestId);
export const api = axios.create({ baseURL: "/api", timeout: 8000 });
api.interceptors.request.use(async (config) => {
  await waitForMockRecovery();
  const token = localStorage.getItem("kurio.session");
  if (token && !config.headers.Authorization)
    config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-guest-id"] = guestId;
  return config;
});
api.interceptors.response.use(
  async (response) => {
    const contentType = String(response.headers["content-type"] || "");
    if (!/application\/(?:[\w.+-]*\+)?json\b/i.test(contentType)) {
      const config = response.config as InternalAxiosRequestConfig & {
        mockRecoveryAttempted?: boolean;
      };
      if (!config.mockRecoveryAttempted && !config.signal?.aborted) {
        const recovered = await recoverMockConnection();
        if (recovered && config.method === "get" && !config.signal?.aborted) {
          config.mockRecoveryAttempted = true;
          return api.request(config);
        }
        if (recovered)
          throw new InvalidResponseError(
            "a operação",
            "MOCK_CONNECTION",
            "A conexão com a demonstração foi restabelecida. Tente novamente.",
          );
      }
      throw new InvalidResponseError(
        "a API",
        "MOCK_CONNECTION",
        "Não foi possível acessar a API da demonstração. Recarregue a página e tente novamente.",
      );
    }
    return response;
  },
  async (error) => {
    if (axios.isAxiosError(error) && error.config) {
      const config = error.config as InternalAxiosRequestConfig & {
        mockRecoveryAttempted?: boolean;
      };
      const wrongContent =
        !!error.response &&
        !/application\/(?:[\w.+-]*\+)?json\b/i.test(
          String(error.response.headers["content-type"] || ""),
        );
      if (
        !config.mockRecoveryAttempted &&
        !config.signal?.aborted &&
        (wrongContent || error.code === "ERR_NETWORK")
      ) {
        const recovered = await recoverMockConnection();
        if (recovered && config.method === "get" && !config.signal?.aborted) {
          config.mockRecoveryAttempted = true;
          return api.request(config);
        }
        if (recovered && wrongContent)
          throw new InvalidResponseError(
            "a operação",
            "MOCK_CONNECTION",
            "A conexão com a demonstração foi restabelecida. Tente novamente.",
          );
      }
    }
    if (
      axios.isAxiosError<ApiError>(error) &&
      error.response?.data?.code === "SESSION_EXPIRED"
    )
      window.dispatchEvent(
        new CustomEvent("kurio:expired", {
          detail: String(error.config?.headers.Authorization || "").replace(
            "Bearer ",
            "",
          ),
        }),
      );
    return Promise.reject(error);
  },
);
export function errorData(error: unknown): ApiError {
  if (error instanceof InvalidResponseError)
    return { code: error.code, message: error.message };
  if (axios.isAxiosError<ApiError>(error)) {
    const data: unknown = error.response?.data;
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string" &&
      "code" in data &&
      typeof data.code === "string"
    )
      return data as ApiError;
    return {
      code: error.code || "NETWORK",
      message:
        error.code === "ECONNABORTED"
          ? "A resposta demorou. Verifique o estado antes de tentar novamente."
          : "Sem conexão. Tente novamente.",
    };
  }
  return {
    code: "UNKNOWN",
    message: error instanceof Error ? error.message : "Ocorreu uma falha.",
  };
}
export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const data: unknown = (await api.get<unknown>(path, { signal })).data;
  const resource = path.split("?")[0];
  if (resource === "/nfts" && !isCatalog(data))
    throw new InvalidResponseError("o catálogo");
  if (resource.startsWith("/nfts/") && !isNft(data))
    throw new InvalidResponseError("esta obra");
  return data as T;
}
export async function post<T>(path: string, data: unknown): Promise<T> {
  return (await api.post<T>(path, data)).data;
}
