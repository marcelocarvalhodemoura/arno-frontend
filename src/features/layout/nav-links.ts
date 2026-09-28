import {
  FaCalendarCheck,
  FaChartLine,
  FaFileImport,
  FaFlag,
  FaHome,
  FaListAlt,
  FaPaperPlane,
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

export type NavSection = {
  id: string;
  label: string;
  items: NavLinkItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "painel",
    label: "Painel",
    items: [{ to: "/", label: "Dashboard", icon: FaHome, end: true, roles: ["admin"] }],
  },
  {
    id: "movimentacoes",
    label: "Movimentações",
    items: [
      { to: "/fluxo", label: "Fluxo de caixa", icon: FaChartLine, roles: ["admin", "tesoureiro"] },
      { to: "/mensalidades", label: "Mensalidade", icon: FaCalendarCheck, roles: ["admin", "tesoureiro"] },
      { to: "/tipos", label: "Tipo de movimentação", icon: FaListAlt, roles: ["admin", "tesoureiro"] },
      { to: "/taxas", label: "Taxa", icon: FaPercentage, roles: ["admin", "tesoureiro"] },
      { to: "/projetos", label: "Previsão de gastos", icon: FaFlag, roles: ["admin"] },
    ],
  },
  {
    id: "pessoas",
    label: "Pessoas",
    items: [
      { to: "/associados", label: "Associados", icon: FaUsers, roles: ["admin", "tesoureiro"] },
      { to: "/usuarios", label: "Usuários", icon: FaUserShield, roles: ["admin"] },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    items: [
      { to: "/relatorios", label: "Relatório", icon: FaReceipt, roles: ["admin"] },
      { to: "/integracao", label: "Integrações", icon: FaFileImport, roles: ["admin", "tesoureiro"] },
      { to: "/configuracoes", label: "Disparos de mensagem", icon: FaPaperPlane, roles: ["admin"] },
    ],
  },
];

/** Lista plana — útil em testes e redirects. */
export const NAV_LINKS: NavLinkItem[] = NAV_SECTIONS.flatMap((section) => section.items);
