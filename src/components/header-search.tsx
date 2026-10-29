import { useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type { CatalogSearch } from "../domain/types";
export function HeaderSearch() {
  const [open, setOpen] = useState(false),
    button = useRef<HTMLButtonElement>(null);
  const search = useSearch({ strict: false }) as CatalogSearch,
    navigate = useNavigate();
  function close() {
    setOpen(false);
    button.current?.focus();
  }
  return (
    <form
      className="header-search"
      onSubmit={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label="Abrir busca"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Search size={24} />
      </button>
      {open && (
        <input
          autoFocus
          aria-label="Buscar NFTs"
          placeholder="Explorar coleções"
          value={search.q || ""}
          onChange={(event) =>
            void navigate({
              to: "/",
              search: (previous: CatalogSearch) => ({
                ...previous,
                q: event.target.value,
                page: 1,
              }),
              resetScroll: false,
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        />
      )}
    </form>
  );
}
