import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { ErrorBox, Select } from "../components/shared";
import { get, post } from "../lib/api";
const scenarios = [
  ["success", "Sucesso"],
  ["empty", "Catálogo vazio"],
  ["slow", "Rede lenta"],
  ["out-of-order", "Respostas fora de ordem"],
  ["offline", "Sem conexão"],
  ["http-500", "Erro HTTP 503"],
  ["expired-session", "Sessão expirada"],
  ["favorite-failure", "Falha ao favoritar"],
  ["payment-declined", "Pagamento recusado"],
  ["order-timeout", "Timeout após criar pedido"],
  ["pending", "Pedido pendente"],
  ["price-change", "Preço muda ao confirmar"],
  ["sold-out", "Estoque esgota ao confirmar"],
  ["validation", "Erros de validação"],
  ["wallet-refused", "Carteira recusa conexão"],
  ["wallet-disconnected", "Carteira desconectada"],
];
export function Scenarios() {
  const [scenario, setScenario] = useState("success"),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState(""),
    [confirmReset, setConfirmReset] = useState(false),
    [resetting, setResetting] = useState(false),
    [nftId, setNft] = useState("nft-1");
  useEffect(() => {
    void get<{ scenario: string }>("/debug/state")
      .then((d) => setScenario(d.scenario))
      .catch(setError);
  }, []);
  async function action(name: string) {
    setError(null);
    try {
      await post("/debug/action", { action: name, nftId });
      setNotice(`Ação ${name} enviada pela camada de mocks.`);
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="scenario-trigger">
          Laboratório de cenários
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Laboratório da demonstração</DialogTitle>
        <DialogDescription>
          Controle falhas e tempo real com MSW. Use apenas dados fictícios.
        </DialogDescription>
        <Select
          label="Cenário"
          id="scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
        >
          {scenarios.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </Select>
        <Button
          onClick={() =>
            void post("/debug/scenario", { scenario })
              .then(() => {
                setNotice(
                  "Cenário ativo. Refaça a ação ou recarregue a página.",
                );
                setError(null);
              })
              .catch(setError)
          }
        >
          Ativar cenário sem reset
        </Button>
        <Button variant="outline" onClick={() => setConfirmReset(true)}>
          Reset completo e aplicar cenário
        </Button>
        {confirmReset && (
          <div className="notice" role="alert">
            <p>
              Isso apaga contas, carrinhos, carteiras e pedidos fictícios deste
              navegador. Deseja restaurar a demonstração?
            </p>
            <div className="button-row">
              <Button
                disabled={resetting}
                onClick={() => {
                  setResetting(true);
                  void post("/debug/reset", { scenario })
                    .then(() => {
                      for (const key of Object.keys(localStorage))
                        if (
                          key.startsWith("kurio.") &&
                          !key.startsWith("kurio.mock.")
                        )
                          localStorage.removeItem(key);
                      location.assign("/demo");
                    })
                    .catch(setError)
                    .finally(() => setResetting(false));
                }}
              >
                {resetting ? "Restaurando…" : "Confirmar reset"}
              </Button>
              <Button
                variant="outline"
                disabled={resetting}
                onClick={() => setConfirmReset(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        <hr />
        <Select
          label="NFT afetado"
          id="debug-nft"
          value={nftId}
          onChange={(e) => setNft(e.target.value)}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={`nft-${i + 1}`}>
              NFT {i + 1}
            </option>
          ))}
        </Select>
        <div className="debug-actions">
          <Button variant="outline" onClick={() => void action("price")}>
            Alterar preço via Socket.IO
          </Button>
          <Button variant="outline" onClick={() => void action("stock")}>
            Esgotar estoque
          </Button>
          <Button variant="outline" onClick={() => void action("duplicates")}>
            Duplicatas e evento antigo
          </Button>
          <Button variant="outline" onClick={() => void action("disconnect")}>
            Interromper conexão
          </Button>
          <Button variant="outline" onClick={() => void action("settle")}>
            Concluir pedidos pendentes
          </Button>
          <Button variant="outline" onClick={() => void action("expire")}>
            Expirar sessão
          </Button>
        </div>
        {notice && <p role="status">{notice}</p>}
        <ErrorBox error={error} />
      </DialogContent>
    </Dialog>
  );
}
