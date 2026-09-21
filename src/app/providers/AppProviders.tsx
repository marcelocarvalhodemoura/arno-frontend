import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter } from "react-router-dom";
import { routerBasename } from "@/core/config/app-base";
import { AuthProvider } from "@/features/auth";
import { LoadingProvider } from "@/shared/feedback/loading";
import { ToastProvider } from "@/shared/feedback/toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <LoadingProvider>
          <ToastProvider>
            <BrowserRouter basename={routerBasename}>{children}</BrowserRouter>
          </ToastProvider>
        </LoadingProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
