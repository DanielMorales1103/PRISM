# Prism API

Backend inicial para Prism MedConnect.

## Stack

- Node.js
- Express
- TypeScript
- MongoDB con Mongoose

## Configuracion

Copiar `.env.example` a `.env` y ajustar `MONGODB_URI` con la cadena de MongoDB Atlas.

```powershell
pnpm --filter @prism/api dev
```

Healthcheck:

```text
GET http://localhost:4000/health
```

## Modelos iniciales

Al iniciar el API se registran modelos Mongoose para:

- Users
- Products
- Specialties
- Cycles
- Doctors
- Pharmacies
- Institutions
- VisitPlans
- Visits
- Trainings
- EvaluationResults
- SyncLogs

Con `CREATE_COLLECTIONS=true`, el API crea colecciones e indices al levantar. Con `SEED_DATABASE=true`, inserta datos iniciales de prueba: admin, productos base, especialidades y ciclos.

## Deploy en Vercel

El API ya esta adaptado para Vercel usando `api/index.ts` y `vercel.json`.

Configuracion recomendada al importar el repo:

- Root Directory: `apps/api`
- Framework Preset: Other
- Build Command: vacio o `pnpm build`
- Output Directory: vacio

Variables de entorno necesarias:

- `MONGODB_URI`
- `PORT` opcional para local, Vercel lo ignora
- `CREATE_COLLECTIONS=true`
- `SEED_DATABASE=true` solo mientras se quieran cargar datos iniciales
- `DEFAULT_ADMIN_NAME`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`

Vercel dara una URL publica sin dominio propio, por ejemplo `https://prism-api.vercel.app`.
