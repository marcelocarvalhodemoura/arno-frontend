# arno-frontend

Tesouraria do Grupo Escoteiro Arno Friedrich. React + Vite, alinhado à API do `arno-backend`.

## Estrutura

O código está separado por responsabilidade (camadas + features), não por tipo de arquivo solto:

```
src/
  app/            composição da aplicação (providers, rotas, guards)
  core/           infraestrutura: HTTP, token, sessão, config
  domain/         tipos e regras de negócio puras (sem React, sem I/O)
  modules/        adaptadores de API por bounded context
  features/       telas e UI de cada caso de uso
  shared/         UI, hooks e libs reutilizáveis
```

Dependências apontam para dentro: `features` → `shared` / `modules` / `core` / `domain`. `domain` não depende de React.

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

A API do `arno-backend` precisa estar em `http://127.0.0.1:4000` (ou o valor de `VITE_API_PROXY`).

```bash
npm run test:unit
npm run build
```
# arno-frontend
