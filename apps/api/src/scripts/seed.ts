import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase } from '../database/connection.js';
import { seedInitialData } from '../seeds/initial.seed.js';

async function main() {
  await connectDatabase(env.mongoUri);
  await seedInitialData({
    adminName: env.defaultAdminName,
    adminEmail: env.defaultAdminEmail,
    adminPassword: env.defaultAdminPassword,
  });

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error('Mongo database connection is not available');
  }

  const products = await database
    .collection('products')
    .find({}, { projection: { name: 1, line: 1, presentation: 1, imageUrl: 1 } })
    .sort({ name: 1 })
    .toArray();

  console.log(
    JSON.stringify(
      products.map((product) => ({
        name: product.name,
        line: product.line,
        presentation: product.presentation,
        hasImage: Boolean(product.imageUrl),
      })),
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
