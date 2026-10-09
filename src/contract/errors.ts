// GERADO a partir de arno-backend/src/contract/errors.ts — não edite.
// sha256: 0a343b97a8688582649087ec61ae6949ad698cc115af4dd99ebfed2c820870d5
/** Valor que fere uma regra do contrato (valor inválido, competência fora do formato). No backend, responde 400. */
export class ContractViolation extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'ContractViolation';
  }
}
