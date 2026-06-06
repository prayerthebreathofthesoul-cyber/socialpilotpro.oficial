# SocialPilot Mini - versão pronta para V0/Vercel

Esta versão foi ajustada para rodar na raiz do repositório, sem depender do backend do Replit.

## Correções principais

- Removidas dependências `catalog:` e `workspace:*` que quebravam fora do Replit.
- Substituído `@workspace/api-client-react` por um mock local em `src/lib/mock-api.ts`.
- Ajustado `vite.config.ts` para usar porta 8080 sem exigir `PORT` e `BASE_PATH`.
- Ajustado `tsconfig.json` para não depender de `../../tsconfig.base.json`.

## Comandos

```bash
npm install
npm run dev
```

Ou, com pnpm:

```bash
pnpm install
pnpm run dev
```
