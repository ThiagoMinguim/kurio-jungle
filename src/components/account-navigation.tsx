import { Link, useLocation } from "@tanstack/react-router";
import {
  UserRound,
  MapPin,
  ShoppingCart,
  Heart,
  ChartNoAxesCombined,
  Download,
  TriangleAlert,
  LogOut,
} from "lucide-react";
import { useAuth } from "../app/session";
export function AccountNavigation() {
  const location = useLocation(),
    { logout } = useAuth();
  return (
    <nav className="account-nav" aria-label="Conta">
      <h2>Meu perfil</h2>
      <Link
        to="/profile"
        aria-current={location.pathname === "/profile" ? "page" : undefined}
      >
        <UserRound />
        Dados do perfil
      </Link>
      <Link
        to="/wallets"
        aria-current={location.pathname === "/wallets" ? "page" : undefined}
      >
        <MapPin />
        Carteiras
      </Link>
      <Link
        to="/activity"
        aria-current={location.pathname === "/activity" ? "page" : undefined}
      >
        <ShoppingCart />
        Atividade
      </Link>
      <Link to="/favorites">
        <Heart />
        Lista de interesse
      </Link>
      <Link
        to="/offers"
        aria-current={location.pathname === "/offers" ? "page" : undefined}
      >
        <ChartNoAxesCombined />
        Ofertas
      </Link>
      <Link
        to="/downloads"
        aria-current={location.pathname === "/downloads" ? "page" : undefined}
      >
        <Download />
        Arquivos baixados
      </Link>
      <Link
        to="/support"
        aria-current={location.pathname === "/support" ? "page" : undefined}
      >
        <TriangleAlert />
        Suporte
      </Link>
      <button type="button" onClick={() => void logout()}>
        <LogOut />
        Sair
      </button>
    </nav>
  );
}
