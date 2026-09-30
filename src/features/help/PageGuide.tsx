import { useState } from "react";
import { FaQuestion } from "react-icons/fa";
import GuideDrawer from "@/features/help/GuideDrawer";
import type { PageGuideContent } from "@/features/help/types";

type Props = {
  guide: PageGuideContent;
  /** Texto do botão. Padrão: “Como usar”. */
  label?: string;
};

/** Botão de cabeçalho + drawer com o manual da tela. */
export default function PageGuide({ guide, label = "Como usar" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="page-guide__trigger"
        onClick={() => setOpen(true)}
        title="Abrir o manual desta tela"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="page-guide__trigger-icon" aria-hidden>
          <FaQuestion />
        </span>
        <span className="page-guide__trigger-text">
          <span className="page-guide__trigger-kicker">Ajuda</span>
          <span className="page-guide__trigger-label">{label}</span>
        </span>
      </button>
      <GuideDrawer guide={guide} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
