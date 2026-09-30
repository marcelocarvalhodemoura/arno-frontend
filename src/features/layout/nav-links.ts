import {
  FaCalendarCheck,
  FaChartLine,
  FaCog,
  FaCookieBite,
  FaExchangeAlt,
  FaFileImport,
  FaFlag,
  FaHandHoldingUsd,
  FaHome,
  FaListAlt,
  FaPaperPlane,
  FaPercentage,
  FaReceipt,
  FaThLarge,
  FaUserShield,
  FaUsers,
  FaWallet,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { UserRole } from "@/domain";

export type NavLinkItem = {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
  roles: UserRole[];
};

export type NavSection = {
  id: string;
  label: string;
  icon: IconType;
  items: NavLinkItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "painel",
    label: "Painel",
    icon: FaThLarge,
    items: [{ to: "/", label: "Dashboard", icon: FaHome, end: true, roles: ["admin"] }],
  },
  {
    id: "movimentacoes",
    label: "Movimentações",
    icon: FaWallet,
    items: [
      { to: "/fluxo", label: "Fluxo de caixa", icon: FaChartLine, roles: ["admin", "tesoureiro"] },
      { to: "/mensalidades", label: "Mensalidade", icon: FaCalendarCheck, roles: ["admin", "tesoureiro"] },
      { to: "/repasse-clube", label: "Repasse ao clube", icon: FaExchangeAlt, roles: ["admin", "tesoureiro"] },
      { to: "/taxa-lanche", label: "Taxa do lanche", icon: FaCookieBite, roles: ["admin", "tesoureiro"] },
      { to: "/dividas", label: "Dívidas", icon: FaHandHoldingUsd, roles: ["admin", "tesoureiro"] },
      { to: "/tipos", label: "Tipo de movimentação", icon: FaListAlt, roles: ["admin", "tesoureiro"] },
      { to: "/taxas", label: "Taxa", icon: FaPercentage, roles: ["admin", "tesoureiro"] },
      { to: "/projetos", label: "Previsão de gastos", icon: FaFlag, roles: ["admin"] },
    ],
  },
  {
    id: "pessoas",
    label: "Pessoas",
    icon: FaUsers,
    items: [
      { to: "/associados", label: "Associados", icon: FaUsers, roles: ["admin", "tesoureiro"] },
      { to: "/usuarios", label: "Usuários", icon: FaUserShield, roles: ["admin"] },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: FaCog,
    items: [
      { to: "/relatorios", label: "Relatório", icon: FaReceipt, roles: ["admin"] },
      { to: "/integracao", label: "Integrações", icon: FaFileImport, roles: ["admin", "tesoureiro"] },
      { to: "/configuracoes", label: "Disparos de mensagem", icon: FaPaperPlane, roles: ["admin"] },
    ],
  },
];

/** Lista plana — útil em testes e redirects. */
export const NAV_LINKS: NavLinkItem[] = NAV_SECTIONS.flatMap((section) => section.items);
