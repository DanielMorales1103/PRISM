import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { connectDatabase, getDatabaseStatus } from './database/connection.js';
import { ensureCollectionsAndIndexes, getModelNames } from './models/index.js';
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { clientRouter } from './routes/client.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { productRouter } from './routes/product.routes.js';
import { userRouter } from './routes/user.routes.js';
import { seedInitialData } from './seeds/initial.seed.js';

export const app = express();

let databaseSetupPromise: Promise<void> | null = null;

export async function ensureDatabaseSetup() {
  if (!databaseSetupPromise) {
    databaseSetupPromise = (async () => {
      await connectDatabase(env.mongoUri);

      if (env.createCollections) {
        await ensureCollectionsAndIndexes();
      }

      if (env.seedDatabase) {
        await seedInitialData({
          adminName: env.defaultAdminName,
          adminEmail: env.defaultAdminEmail,
          adminPassword: env.defaultAdminPassword,
        });
      }
    })().catch((error) => {
      databaseSetupPromise = null;
      throw error;
    });
  }

  return databaseSetupPromise;
}

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await ensureDatabaseSetup();
  } catch (error) {
    console.warn('MongoDB setup failed during health check.');
    console.warn(error);
  }

  res.json({
    ok: true,
    service: 'prism-api',
    mongo: getDatabaseStatus(),
    models: getModelNames(),
  });
});

app.use('/api', async (_req, res, next) => {
  try {
    await ensureDatabaseSetup();
    next();
  } catch (error) {
    console.error(error);
    res.status(503).json({ message: 'Database is not available' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/catalogs', catalogRouter);
app.use('/api/clients', clientRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: 'Unexpected server error' });
});
