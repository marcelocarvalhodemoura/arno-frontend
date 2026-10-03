import { type ReactNode } from "react";
import FetchOverlay from "@/shared/ui/FetchOverlay";

type Props = {
  fetching?: boolean;
  fetchLabel?: string;
  children: ReactNode;
};

export default function ListingResults({ fetching = false, fetchLabel = "Atualizando…", children }: Props) {
  return (
    <FetchOverlay active={fetching} label={fetchLabel}>
      <div className="listing-results" aria-busy={fetching}>
        {children}
      </div>
    </FetchOverlay>
  );
}
