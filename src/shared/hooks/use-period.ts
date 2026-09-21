import { useOutletContext } from "react-router-dom";

export type Period = {
  year: number;
  month: number;
  setYear: (n: number) => void;
  setMonth: (n: number) => void;
};

export function usePeriod(): Period {
  return useOutletContext<Period>();
}
