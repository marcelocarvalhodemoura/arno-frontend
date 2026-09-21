import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "@/domain";
import { useAuth } from "@/features/auth";
import SessionSplash from "@/shared/ui/SessionSplash";

export function RequireSession({ children }: { children: ReactNode }) {
  const { user, role, ready } = useAuth();
  if (!ready) return <SessionSplash />;
  if (!user || !role) return <Navigate to="/login" replace />;
  return children;
}

export function RequireRole({ children, roles }: { children: ReactNode; roles: UserRole[] }) {
  const { role } = useAuth();
  if (roles && role && !roles.includes(role)) {
    return <Navigate to={role === "tesoureiro" ? "/fluxo" : "/"} replace />;
  }
  return children;
}
