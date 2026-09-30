import type { ReactNode } from "react";

export type GuideMedia = {
  /** Caminho em `/help/...` quando a captura existir. Sem `src`, mostra placeholder. */
  src?: string;
  alt: string;
  caption?: string;
};

export type GuideStep = {
  id: string;
  title: string;
  body: ReactNode;
  media?: GuideMedia;
};

export type PageGuideContent = {
  id: string;
  title: string;
  intro: string;
  steps: GuideStep[];
};
