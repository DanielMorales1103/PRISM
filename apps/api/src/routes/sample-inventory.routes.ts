import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { ProductModel } from '../models/product.model.js';
import { SampleInventoryModel } from '../models/sample-inventory.model.js';
import { UserModel } from '../models/user.model.js';

export const sampleInventoryRouter = Router();

function canManageSamples(role: string | undefined) {
  return role === 'admin' || role === 'jefe';
}

sampleInventoryRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const userId = canManageSamples(req.auth?.role) && Types.ObjectId.isValid(requestedUserId)
      ? new Types.ObjectId(requestedUserId)
      : new Types.ObjectId(req.auth!.sub);
    const inventory = await SampleInventoryModel.find({ userId }).sort({ updatedAt: -1 }).lean();
    const products = await ProductModel.find({ _id: { $in: inventory.map((item) => item.productId) } }).lean();
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));

    res.json(inventory.flatMap((item) => {
      const product = productsById.get(item.productId.toString());
      return product ? [{
        id: item._id.toString(),
        userId: item.userId.toString(),
        productId: product._id.toString(),
        productName: product.name,
        line: product.line,
        presentation: product.presentation,
        quantity: item.quantity,
      }] : [];
    }));
  } catch (error) {
    next(error);
  }
});

sampleInventoryRouter.post('/assign', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
    const productId = typeof req.body?.productId === 'string' ? req.body.productId : '';
    const quantity = Number(req.body?.quantity);

    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ message: 'Visitador, producto y una cantidad entera mayor a cero son requeridos.' });
      return;
    }

    const [user, product] = await Promise.all([
      UserModel.findOne({ _id: userId, active: true, role: 'visitador' }),
      ProductModel.findOne({ _id: productId, active: true }),
    ]);

    if (!user || !product) {
      res.status(404).json({ message: 'El visitador o producto seleccionado no esta disponible.' });
      return;
    }

    const inventory = await SampleInventoryModel.findOneAndUpdate(
      { userId: user._id, productId: product._id },
      { $inc: { quantity } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(201).json({
      id: inventory._id.toString(),
      userId: inventory.userId.toString(),
      productId: product._id.toString(),
      productName: product.name,
      line: product.line,
      presentation: product.presentation,
      quantity: inventory.quantity,
    });
  } catch (error) {
    next(error);
  }
});
