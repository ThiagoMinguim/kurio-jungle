import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { db } from "./database";
import type { DomainEvent } from "../domain/types";
type Connection = {
  token: string;
  emit: (event: DomainEvent) => void;
  close: () => void;
};
const clients = new Set<Connection>();
const link = ws.link(`${location.origin.replace(/^http/, "ws")}/`);
export const socketHandler = link.addEventListener(
  "connection",
  (connection) => {
    const bound = toSocketIo(connection);
    const entry: Connection = {
      token: "",
      emit: (event) => bound.client.emit(event.type, event),
      close: () => connection.client.close(1012, "Interrupção simulada"),
    };
    bound.client.on("subscribe", (_event, token: string) => {
      entry.token = db.sessions.some(
        (s) => s.token === token && s.expiresAt > Date.now(),
      )
        ? token
        : "";
      clients.add(entry);
    });
    const heartbeat = setInterval(() => connection.client.send("2"), 20000);
    connection.client.addEventListener("close", () => {
      clearInterval(heartbeat);
      clients.delete(entry);
    });
  },
);
export function publish(event: DomainEvent, userId?: string) {
  for (const client of clients) {
    const session = db.sessions.find(
      (s) => s.token === client.token && s.expiresAt > Date.now(),
    );
    if (userId && session?.user.id !== userId) continue;
    client.emit({ ...event, sessionToken: client.token });
  }
}
export function disconnectMocks() {
  for (const client of [...clients]) client.close();
}
