import { useEffect, useState } from "react";
import { setActiveFeeSchedule, type FeeSchedule } from "@/domain";
import { api } from "@/core/http";

/**
 * Carrega a composição da mensalidade ao abrir o sistema.
 * Cadastro, lançamento e importação calculam valores com ela; até chegar, vale a tabela padrão.
 */
export function useLoadFeeSchedule() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    api<FeeSchedule>("/fee-schedule")
      .then((schedule) => {
        if (!alive) return;
        setActiveFeeSchedule(schedule);
        setVersion((value) => value + 1);
      })
      .catch(() => {
        /* mantém a tabela padrão */
      });
    return () => {
      alive = false;
    };
  }, []);
}
