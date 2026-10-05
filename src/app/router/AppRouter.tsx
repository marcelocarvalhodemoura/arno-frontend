import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RequireRole, RequireSession } from "@/app/router/guards";
import { useAuth } from "@/features/auth";
import LoginPage from "@/features/auth/LoginPage";
import CashFlowPage from "@/features/cash-flow/CashFlowPage";
import FeesPage from "@/features/catalog/FeesPage";
import FeeSchedulePage from "@/features/fee-schedule/FeeSchedulePage";
import MovementTypesPage from "@/features/catalog/MovementTypesPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import UsersPage from "@/features/identity/UsersPage";
import IntegrationPage from "@/features/integration/IntegrationPage";
import Layout from "@/features/layout/Layout";
import MembersPage from "@/features/members/MembersPage";
import MensalidadesPage from "@/features/mensalidades/MensalidadesPage";
import ClubRemittancePage from "@/features/club-remittance/ClubRemittancePage";
import SnackFundPage from "@/features/snack-fund/SnackFundPage";
import ArrearsPage from "@/features/arrears/ArrearsPage";
import ProjectsPage from "@/features/projects/ProjectsPage";
import ReportsPage from "@/features/reports/ReportsPage";
import AuditPage from "@/features/audit/AuditPage";
import SettingsPage from "@/features/settings/SettingsPage";
import SessionSplash from "@/shared/ui/SessionSplash";

function Shell() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(0);
  return (
    <RequireSession>
      <Layout year={year} month={month} setYear={setYear} setMonth={setMonth} />
    </RequireSession>
  );
}

function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={role === "tesoureiro" ? "/fluxo" : "/"} replace />;
}

export function AppRouter() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <SessionSplash />;
  }

  return (
    <AnimatePresence mode="wait">
      {user ? (
        <motion.div
          key="app"
          className="app-frame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Routes location={location}>
            <Route element={<Shell />}>
              <Route
                index
                element={
                  <RequireRole roles={["admin"]}>
                    <DashboardPage />
                  </RequireRole>
                }
              />
              <Route path="fluxo" element={<CashFlowPage />} />
              <Route path="mensalidades" element={<MensalidadesPage />} />
              <Route path="repasse-clube" element={<ClubRemittancePage />} />
              <Route path="taxa-lanche" element={<SnackFundPage />} />
              <Route path="dividas" element={<ArrearsPage />} />
              <Route path="integracao" element={<IntegrationPage />} />
              <Route path="tipos" element={<MovementTypesPage />} />
              <Route path="taxas" element={<FeesPage />} />
              <Route path="composicao-mensalidade" element={<FeeSchedulePage />} />
              <Route path="associados" element={<MembersPage />} />
              <Route
                path="projetos"
                element={
                  <RequireRole roles={["admin"]}>
                    <ProjectsPage />
                  </RequireRole>
                }
              />
              <Route
                path="relatorios"
                element={
                  <RequireRole roles={["admin"]}>
                    <ReportsPage />
                  </RequireRole>
                }
              />
              <Route
                path="auditoria"
                element={
                  <RequireRole roles={["superadmin"]}>
                    <AuditPage />
                  </RequireRole>
                }
              />
              <Route path="prestacao-de-contas" element={<Navigate to="/relatorios?modelo=assembly" replace />} />
              <Route
                path="configuracoes"
                element={
                  <RequireRole roles={["admin"]}>
                    <SettingsPage />
                  </RequireRole>
                }
              />
              <Route
                path="usuarios"
                element={
                  <RequireRole roles={["admin"]}>
                    <UsersPage />
                  </RequireRole>
                }
              />
            </Route>
            <Route path="login" element={<HomeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      ) : (
        <motion.div
          key="login"
          className="app-frame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Routes location={location}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
