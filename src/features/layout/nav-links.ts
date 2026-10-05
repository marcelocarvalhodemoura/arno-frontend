import {
  FaAddressBook,
  FaCalendarCheck,
  FaChartBar,
  FaChartLine,
  FaChartPie,
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
  FaUserSecret,
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

/** Seções por tarefa: rotina do caixa, mensalidades, cadastros, planejamento e administração. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "painel",
    label: "Painel",
    icon: FaThLarge,
    items: [{ to: "/", label: "Dashboard", icon: FaHome, end: true, roles: ["admin"] }],
  },
  {
    id: "caixa",
    label: "Caixa",
    icon: FaWallet,
    items: [
      { to: "/fluxo", label: "Fluxo de caixa", icon: FaChartLine, roles: ["admin", "tesoureiro"] },
      { to: "/integracao", label: "Integrações", icon: FaFileImport, roles: ["admin", "tesoureiro"] },
    ],
  },
  {
    id: "mensalidades",
    label: "Mensalidades",
    icon: FaCalendarCheck,
    items: [
      { to: "/mensalidades", label: "Mensalidade", icon: FaCalendarCheck, roles: ["admin", "tesoureiro"] },
      { to: "/dividas", label: "Dívidas", icon: FaHandHoldingUsd, roles: ["admin", "tesoureiro"] },
      { to: "/repasse-clube", label: "Repasse ao clube", icon: FaExchangeAlt, roles: ["admin", "tesoureiro"] },
      { to: "/taxa-lanche", label: "Taxa do lanche", icon: FaCookieBite, roles: ["admin", "tesoureiro"] },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    icon: FaAddressBook,
    items: [
      { to: "/associados", label: "Associados", icon: FaUsers, roles: ["admin", "tesoureiro"] },
      {
        to: "/composicao-mensalidade",
        label: "Composição da mensalidade",
        icon: FaChartPie,
        roles: ["admin", "tesoureiro"],
      },
      { to: "/tipos", label: "Tipos de movimentação", icon: FaListAlt, roles: ["admin", "tesoureiro"] },
      { to: "/taxas", label: "Taxas", icon: FaPercentage, roles: ["admin", "tesoureiro"] },
    ],
  },
  {
    id: "planejamento",
    label: "Planejamento",
    icon: FaChartBar,
    items: [
      { to: "/projetos", label: "Previsão de gastos", icon: FaFlag, roles: ["admin"] },
      { to: "/relatorios", label: "Relatórios", icon: FaReceipt, roles: ["admin"] },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: FaCog,
    items: [
      { to: "/usuarios", label: "Usuários", icon: FaUserShield, roles: ["admin"] },
      { to: "/configuracoes", label: "Disparos de mensagem", icon: FaPaperPlane, roles: ["admin"] },
      { to: "/auditoria", label: "Auditoria", icon: FaUserSecret, roles: ["superadmin"] },
    ],
  },
];

/** Lista plana — útil em testes e redirects. */
export const NAV_LINKS: NavLinkItem[] = NAV_SECTIONS.flatMap((section) => section.items);
