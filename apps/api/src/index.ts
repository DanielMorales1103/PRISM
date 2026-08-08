import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/prism_medconnect';

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'prism-api',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

async function bootstrap() {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('MongoDB connection failed. API will start without database connection.');
    console.warn(error);
  }

  app.listen(port, () => {
    console.log(`Prism API listening on http://localhost:${port}`);
  });
}

void bootstrap();
