import { app, ensureDatabaseSetup } from './app.js';
import { env } from './config/env.js';
import mongoose from 'mongoose';

let stopping = false;
let server: ReturnType<typeof app.listen> | undefined;

async function shutdown() {
  if (stopping) return;
  stopping = true;

  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }

  await mongoose.disconnect();
}

process.once('SIGINT', () => void shutdown().finally(() => process.exit(0)));
process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));

async function bootstrap() {
  try {
    await ensureDatabaseSetup();
    console.log('MongoDB connected');
    console.log('MongoDB collections and indexes are ready');
    console.log('Initial seed completed');
  } catch (error) {
    console.warn('MongoDB setup failed. API will start without database connection.');
    console.warn(error);
  }

  // A watch restart can arrive while database setup is still running.
  if (stopping) return;

  server = app.listen(env.port, () => {
    console.log(`Prism API listening on http://localhost:${env.port}`);
  });
}

void bootstrap();
