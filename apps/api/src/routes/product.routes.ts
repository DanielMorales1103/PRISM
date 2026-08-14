import { Router } from 'express';
import { ProductModel } from '../models/product.model.js';

export const productRouter = Router();

productRouter.get('/', async (_req, res, next) => {
  try {
    const products = await ProductModel.find().sort({ name: 1 }).lean();

    res.json(
      products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        line: product.line,
        presentation: product.presentation,
        composition: product.composition,
        dosage: product.dosage,
        details: product.details,
        active: product.active,
      })),
    );
  } catch (error) {
    next(error);
  }
});
