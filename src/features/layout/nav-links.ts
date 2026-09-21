import {
  FaCalendarCheck,
  FaChartLine,
  FaCog,
  FaFileImport,
  FaFlag,
  FaHome,
  FaListAlt,
  FaPercentage,
  FaReceipt,
  FaUserShield,
  FaUsers,
} from "react-icons/fa";
import type { UserRole } from "@/domain";

export type NavLinkItem = {
  to: string;
  label: string;
  icon: typeof FaHome;
  end?: boolean;
  roles: UserRole[];
};

export const NAV_LINKS: NavLinkItem[] = [
  { to: "/", label: "Painel", icon: FaHome, end: true, roles: ["admin"] },
  { to: "/fluxo", label: "Fluxo de caixa", icon: FaChartLine, roles: ["admin", "tesoureiro"] },
  { to: "/mensalidades", label: "Mensalidades", icon: FaCalendarCheck, roles: ["admin", "tesoureiro"] },
  { to: "/tipos", label: "Tipos de movimentação", icon: FaListAlt, roles: ["admin", "tesoureiro"] },
  { to: "/taxas", label: "Taxas", icon: FaPercentage, roles: ["admin", "tesoureiro"] },
  { to: "/projetos", label: "Projetos financeiros", icon: FaFlag, roles: ["admin"] },
  { to: "/relatorios", label: "Relatório fiscal", icon: FaReceipt, roles: ["admin"] },
  { to: "/configuracoes", label: "Configurações", icon: FaCog, roles: ["admin"] },
  { to: "/associados", label: "Associados", icon: FaUsers, roles: ["admin", "tesoureiro"] },
  { to: "/usuarios", label: "Usuários", icon: FaUserShield, roles: ["admin"] },
  { to: "/integracao", label: "Integração", icon: FaFileImport, roles: ["admin", "tesoureiro"] },
];
