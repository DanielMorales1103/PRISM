import { app, ensureDatabaseSetup } from './app.js';
import { env } from './config/env.js';

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

  app.listen(env.port, () => {
    console.log(`Prism API listening on http://localhost:${env.port}`);
  });
}

void bootstrap();
