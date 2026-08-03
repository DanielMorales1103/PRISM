# Prism MedConnect Mobile

Aplicacion Android para tablet construida con React Native y Expo.

## Tablet objetivo

- Android: 13
- Modelo: TB310XU
- RAM: 4GB
- Almacenamiento: 128GB

## Comandos

```powershell
pnpm install
pnpm start
pnpm android
pnpm lint
```

## Avance Fase 1

- Splash inspirado en el mock web.
- Login responsive para orientacion vertical y horizontal.
- Home/dashboard inicial con KPIs, agenda y accesos principales.
- Navegacion responsive: sidebar en horizontal y menu compacto en vertical.
- Pantallas iniciales para administracion dentro de la app Android: usuarios, productos, catalogos y KPIs.

## Base tecnica inicial

- React Native con Expo y TypeScript.
- Estructura inicial en `src/`.
- Configuracion Android con package `com.prism.medconnect`.
- Permisos declarados para ubicacion y notificaciones.
- Dependencias instaladas para navegacion, offline, SQLite, SecureStore, ubicacion y notificaciones.

## Nota

El mock anterior era web. Esta app se esta rehaciendo para Android tablet, tomando el diseno como referencia visual y adaptandolo a componentes nativos.
