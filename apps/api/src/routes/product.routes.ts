import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { ProductModel } from '../models/product.model.js';

export const productRouter = Router();

function mapProduct(product: {
  _id: { toString(): string };
  name: string;
  line: string;
  presentation: string;
  unitPrice?: number | null;
  composition?: string | null;
  dosage?: string | null;
  details?: string | null;
  imageUrl?: string | null;
  active: boolean;
}) {
  return {
    id: product._id.toString(),
    name: product.name,
    line: product.line,
    presentation: product.presentation,
    unitPrice: product.unitPrice ?? 100,
    composition: product.composition,
    dosage: product.dosage,
    details: product.details,
    imageUrl: product.imageUrl,
    active: product.active,
  };
}

productRouter.get('/', async (_req, res, next) => {
  try {
    const products = await ProductModel.find().sort({ name: 1 }).lean();

    res.json(products.map(mapProduct));
  } catch (error) {
    next(error);
  }
});

productRouter.post('/', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const line = String(req.body?.line ?? '').trim();
    const presentation = String(req.body?.presentation ?? '').trim();
    const unitPrice = Number(req.body?.unitPrice);
    const composition = String(req.body?.composition ?? '').trim();
    const dosage = String(req.body?.dosage ?? '').trim();
    const details = String(req.body?.details ?? '').trim();
    const imageUrl = String(req.body?.imageUrl ?? '').trim();

    if (!name || !line || !presentation || !Number.isFinite(unitPrice) || unitPrice <= 0 || Math.round(unitPrice * 100) !== unitPrice * 100) {
      res.status(400).json({ message: 'Nombre, línea, presentación y precio unitario válido son requeridos.' });
      return;
    }

    const existingProduct = await ProductModel.findOne({ name });
    if (existingProduct) {
      res.status(409).json({ message: 'Product is already registered' });
      return;
    }

    const product = await ProductModel.create({
      name,
      line,
      presentation,
      unitPrice,
      composition,
      dosage,
      details,
      imageUrl,
      active: true,
    });

    res.status(201).json(mapProduct(product));
  } catch (error) {
    next(error);
  }
});

productRouter.patch('/:id/price', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) { res.status(400).json({ message: 'Producto inválido.' }); return; }
    const unitPrice = Number(req.body?.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0 || Math.round(unitPrice * 100) !== unitPrice * 100) {
      res.status(400).json({ message: 'Ingresa un precio unitario válido, mayor que cero y con hasta dos decimales.' }); return;
    }
    const product = await ProductModel.findByIdAndUpdate(req.params.id, { unitPrice }, { new: true, runValidators: true });
    if (!product) { res.status(404).json({ message: 'Producto no encontrado.' }); return; }
    res.json(mapProduct(product));
  } catch (error) { next(error); }
});
