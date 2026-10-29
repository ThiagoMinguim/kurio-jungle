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
      <span aria-disabled="true">
        <ShoppingCart />
        Atividade
      </span>
      <Link to="/favorites">
        <Heart />
        Lista de interesse
      </Link>
      <span aria-disabled="true">
        <ChartNoAxesCombined />
        Ofertas
      </span>
      <span aria-disabled="true">
        <Download />
        Arquivos baixados
      </span>
      <span aria-disabled="true">
        <TriangleAlert />
        Suporte
      </span>
      <button type="button" onClick={() => void logout()}>
        <LogOut />
        Sair
      </button>
    </nav>
  );
}
