# Prism API

Backend inicial para Prism MedConnect.

## Stack

- Node.js
- Express
- TypeScript
- MongoDB con Mongoose

## Configuracion

Copiar `.env.example` a `.env` y ajustar `MONGODB_URI`.

```powershell
pnpm --filter @prism/api dev
```

Healthcheck:

```text
GET http://localhost:4000/health
```
