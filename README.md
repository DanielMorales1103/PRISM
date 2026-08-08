# Prism MedConnect

Monorepo para la aplicacion Android tablet y backend/API de Prism MedConnect.

## Estructura

```text
apps/mobile      App Android tablet en React Native/Expo
apps/api         Backend/API Node.js + Express + MongoDB
packages/shared Tipos compartidos entre app y API
```

## Comandos

```powershell
pnpm install
pnpm mobile
pnpm mobile:android
pnpm api:dev
pnpm lint
```

## Nota

La app movil fue movida a `apps/mobile`. El backend y los tipos compartidos quedan preparados para la Fase 1.
