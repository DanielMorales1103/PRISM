import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/prism_medconnect',
  seedDatabase: process.env.SEED_DATABASE === 'true',
  createCollections: process.env.CREATE_COLLECTIONS !== 'false',
  jwtSecret: process.env.JWT_SECRET ?? 'local-dev-secret-change-me',
  defaultAdminName: process.env.DEFAULT_ADMIN_NAME ?? 'Admin Prism',
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@prism.com',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD ?? 'Prism2026!',
};
