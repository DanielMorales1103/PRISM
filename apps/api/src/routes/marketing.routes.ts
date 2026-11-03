import { Router } from 'express';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { MarketingAssetModel } from '../models/marketing-asset.model.js';
import { ProductModel } from '../models/product.model.js';

export const marketingRouter = Router();

const maxCoverBytes = 10 * 1024 * 1024;
const maxPresentationBytes = 50 * 1024 * 1024;

function serializeAsset(asset: any) {
  return {
    id: asset._id.toString(),
    productId: asset.productId.toString(),
    type: asset.type,
    version: asset.version,
    fileName: asset.fileName,
    contentType: asset.contentType,
    size: asset.size,
    active: asset.active,
    createdAt: asset.createdAt,
  };
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-120);
}

function isAllowedFile(type: 'cover' | 'presentation', fileName: string, contentType: string) {
  if (type === 'cover') return /^image\/(jpeg|png|webp)$/i.test(contentType);
  return /\.zip$/i.test(fileName) && /^(application\/(zip|x-zip-compressed|octet-stream))?$/i.test(contentType);
}

async function uploadToSupabase(path: string, content: Buffer, contentType: string) {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey || !env.supabaseMarketingBucket) {
    throw new Error('Supabase Storage no está configurado. Agrega SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_MARKETING_BUCKET al .env del API.');
  }

  const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(env.supabaseMarketingBucket)}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      apikey: env.supabaseServiceRoleKey,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'false',
    },
    body: Uint8Array.from(content).buffer,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo guardar el archivo en Supabase Storage. ${detail}`.trim());
  }
}

function assertStorageConfigured() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey || !env.supabaseMarketingBucket) {
    throw new Error('Supabase Storage no está configurado. Agrega SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_MARKETING_BUCKET al .env del API.');
  }
}

async function createSignedUrl(path: string) {
  assertStorageConfigured();

  const baseUrl = env.supabaseUrl!.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/storage/v1/object/sign/${encodeURIComponent(env.supabaseMarketingBucket!)}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      apikey: env.supabaseServiceRoleKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: 15 * 60 }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo preparar la presentación. ${detail}`.trim());
  }

  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signedUrl = payload.signedURL ?? payload.signedUrl;
  if (!signedUrl) {
    throw new Error('Supabase no devolvió una URL para la presentación.');
  }

  return signedUrl.startsWith('http') ? signedUrl : `${baseUrl}/storage/v1${signedUrl.startsWith('/') ? '' : '/'}${signedUrl}`;
}

marketingRouter.get('/', requireAuth, requireRoles('jefe', 'admin'), async (_req, res, next) => {
  try {
    const assets = await MarketingAssetModel.find({ active: true }).sort({ createdAt: -1 }).lean();
    res.json({ configured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey && env.supabaseMarketingBucket), assets: assets.map(serializeAsset) });
  } catch (error) {
    next(error);
  }
});

marketingRouter.get('/products/:productId/presentation', requireAuth, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.productId)) {
      res.status(400).json({ message: 'Producto inválido.' });
      return;
    }

    const product = await ProductModel.exists({ _id: req.params.productId, active: true });
    if (!product) {
      res.status(404).json({ message: 'Producto activo no encontrado.' });
      return;
    }

    const [cover, presentation] = await Promise.all([
      MarketingAssetModel.findOne({ productId: req.params.productId, type: 'cover', active: true }).sort({ version: -1 }).lean(),
      MarketingAssetModel.findOne({ productId: req.params.productId, type: 'presentation', active: true }).sort({ version: -1 }).lean(),
    ]);

    if (!presentation) {
      res.status(404).json({ message: 'Este producto todavía no tiene una presentación publicada.' });
      return;
    }

    const [presentationUrl, coverUrl] = await Promise.all([
      createSignedUrl(presentation.storagePath),
      cover ? createSignedUrl(cover.storagePath) : Promise.resolve(undefined),
    ]);

    res.json({
      presentation: { ...serializeAsset(presentation), url: presentationUrl },
      cover: cover ? { ...serializeAsset(cover), url: coverUrl } : undefined,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

marketingRouter.post('/:productId/assets', requireAuth, requireRoles('jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.productId)) {
      res.status(400).json({ message: 'Producto inválido.' });
      return;
    }

    const type = req.body?.type === 'cover' || req.body?.type === 'presentation' ? req.body.type : null;
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName.trim() : '';
    const contentType = typeof req.body?.contentType === 'string' ? req.body.contentType.trim() : '';
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : '';
    if (!type || !fileName || !base64 || !isAllowedFile(type, fileName, contentType)) {
      res.status(400).json({ message: type === 'cover' ? 'La portada debe ser JPG, PNG o WebP.' : 'La presentación debe ser un archivo ZIP.' });
      return;
    }

    const content = Buffer.from(base64, 'base64');
    const maximumSize = type === 'cover' ? maxCoverBytes : maxPresentationBytes;
    if (!content.length || content.length > maximumSize) {
      res.status(400).json({ message: `El archivo supera el máximo de ${type === 'cover' ? '10 MB' : '50 MB'}.` });
      return;
    }

    const product = await ProductModel.exists({ _id: req.params.productId, active: true });
    if (!product) {
      res.status(404).json({ message: 'Producto activo no encontrado.' });
      return;
    }

    const latest = await MarketingAssetModel.findOne({ productId: req.params.productId, type }).sort({ version: -1 }).lean();
    const version = (latest?.version ?? 0) + 1;
    const storagePath = `${req.params.productId}/${type}/v${version}-${Date.now()}-${safeFileName(fileName)}`;
    await uploadToSupabase(storagePath, content, contentType || 'application/octet-stream');

    await MarketingAssetModel.updateMany({ productId: req.params.productId, type, active: true }, { $set: { active: false } });
    const asset = await MarketingAssetModel.create({
      productId: req.params.productId,
      type,
      version,
      fileName,
      contentType: contentType || 'application/octet-stream',
      size: content.length,
      storagePath,
      active: true,
      uploadedBy: req.auth!.sub,
    });
    res.status(201).json(serializeAsset(asset));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});
