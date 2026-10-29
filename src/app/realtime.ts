import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { queryClient } from "../lib/query";
import { useAuth } from "./session";
import type { DomainEvent } from "../domain/types";
export function useRealtime() {
  const { session } = useAuth(),
    [connected, setConnected] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    const token = session?.token || "",
      seen = new Set<string>(),
      versions = new Map<string, number>();
    const socket = io(location.origin, {
      transports: ["websocket"],
      forceNew: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 1500,
    });
    const reconcile = () => {
      if (!alive) return;
      setConnected(true);
      socket.emit("subscribe", token);
      void queryClient.invalidateQueries({
        predicate: (q) =>
          ["catalog", "nft", "cart", "private"].includes(String(q.queryKey[0])),
      });
    };
    const receive = (event: DomainEvent) => {
      if (!alive || event.sessionToken !== token || seen.has(event.eventId))
        return;
      const resource = `${event.type}:${event.resourceId}`;
      if (event.version <= (versions.get(resource) || 0)) return;
      versions.set(resource, event.version);
      seen.add(event.eventId);
      if (seen.size > 500) seen.delete(seen.values().next().value!);
      if (event.type === "nft.updated")
        setNotice(
          "Preço ou disponibilidade atualizado. Confira o carrinho antes de comprar.",
        );
      // Cancel in-flight snapshots before REST reconciliation; stale REST must not undo a newer event.
      void queryClient
        .cancelQueries({
          predicate: (q) =>
            ["catalog", "nft", "cart", "private"].includes(
              String(q.queryKey[0]),
            ),
        })
        .then(() => {
          if (alive)
            void queryClient.invalidateQueries({
              predicate: (q) =>
                ["catalog", "nft", "cart", "private"].includes(
                  String(q.queryKey[0]),
                ),
            });
        });
    };
    const disconnected = () => {
      if (alive) setConnected(false);
    };
    socket.on("connect", reconcile);
    socket.on("disconnect", disconnected);
    socket.on("nft.updated", receive);
    socket.on("order.updated", receive);
    return () => {
      alive = false;
      socket.off("connect", reconcile);
      socket.off("disconnect", disconnected);
      socket.off("nft.updated", receive);
      socket.off("order.updated", receive);
      socket.disconnect();
      setNotice("");
    };
  }, [session?.token]);
  return { connected, notice, setNotice };
}
