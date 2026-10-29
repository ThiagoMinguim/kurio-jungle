import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, get, post } from "../lib/api";
import { queryClient } from "../lib/query";
import type { Session } from "../domain/types";
type Auth = {
  session: Session | null;
  ready: boolean;
  expired: boolean;
  login: (values: Record<string, string>, register?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<Auth>(null!);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false),
    [expired, setExpired] = useState(false);
  const clear = useCallback(async () => {
    setSession(null);
    localStorage.removeItem("kurio.session");
    await queryClient.cancelQueries({
      predicate: (query) =>
        query.queryKey[0] === "private" || query.queryKey[0] === "cart",
    });
    queryClient.removeQueries({
      predicate: (q) => q.queryKey[0] === "private",
    });
    queryClient.removeQueries({ queryKey: ["cart"] });
  }, []);
  const refresh = useCallback(async () => {
    const token = localStorage.getItem("kurio.session");
    if (!token) return;
    try {
      const recovered = await get<Session>("/session");
      if (localStorage.getItem("kurio.session") === token)
        setSession(recovered);
    } catch {
      if (localStorage.getItem("kurio.session") === token) await clear();
    }
  }, [clear]);
  useEffect(() => {
    let mounted = true;
    async function start() {
      await refresh();
      if (mounted) setReady(true);
    }
    void start();
    const expire = (event: Event) => {
      if (
        (event as CustomEvent<string>).detail !==
        localStorage.getItem("kurio.session")
      )
        return;
      setExpired(true);
      void clear();
    };
    window.addEventListener("kurio:expired", expire);
    return () => {
      mounted = false;
      window.removeEventListener("kurio:expired", expire);
    };
  }, [clear, refresh]);
  async function login(values: Record<string, string>, register = false) {
    await queryClient.cancelQueries({
      predicate: (query) =>
        query.queryKey[0] === "private" || query.queryKey[0] === "cart",
    });
    queryClient.removeQueries({
      predicate: (q) => q.queryKey[0] === "private" || q.queryKey[0] === "cart",
    });
    const result = await post<Session>(
      register ? "/accounts" : "/session",
      values,
    );
    localStorage.setItem("kurio.session", result.token);
    setExpired(false);
    setSession(result);
  }
  async function logout() {
    const token = localStorage.getItem("kurio.session");
    if (session) localStorage.removeItem(`kurio.attempt.${session.user.id}`);
    const request = api
      .delete("/session", { headers: { Authorization: `Bearer ${token}` } })
      .catch(() => undefined);
    await clear();
    setExpired(false);
    await request;
  }
  return (
    <Context.Provider
      value={{ session, ready, expired, login, logout, refresh }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
