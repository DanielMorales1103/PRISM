import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware.js';
import { PresentationVisitModel } from '../models/presentation-visit.model.js';
import { VisitModel } from '../models/visit.model.js';

export const presentationVisitRouter = Router();

function toObjectId(value: unknown) {
  return value ? new Types.ObjectId(String(value)) : undefined;
}

presentationVisitRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.auth?.sub) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const presentedFlows = Array.isArray(body.presentedFlows)
    ? body.presentedFlows.map((flow) => {
        const currentFlow = flow as Record<string, unknown>;

        return {
          ...currentFlow,
          productId: toObjectId(currentFlow.productId),
        };
      })
    : [];

  const completedAt = new Date();
  const doctorId = toObjectId(body.doctorId);
  const visit = await PresentationVisitModel.create({
    userId: new Types.ObjectId(req.auth.sub),
    doctorId,
    doctorName: body.doctorName,
    doctorSpecialty: body.doctorSpecialty,
    clinic: body.clinic,
    address: body.address,
    productId: toObjectId(body.productId),
    productName: body.productName,
    productLine: body.productLine,
    presentedFlows,
    finalFlowType: body.finalFlowType,
    visitStatus: body.visitStatus,
    requestedProducts: body.requestedProducts,
    probablePurchaseDate: body.probablePurchaseDate,
    competitionDetected: body.competitionDetected,
    interestLevel: body.interestLevel,
    requiresFollowUp: body.requiresFollowUp,
    urgentRequest: body.urgentRequest,
    finalComments: body.finalComments,
    completedAt,
  });

  const deliveredProducts = Array.isArray(body.requestedProducts)
    ? body.requestedProducts
      .map((product) => product as Record<string, unknown>)
      .map((product) => ({ productId: toObjectId(product.productId), productName: typeof product.productName === 'string' ? product.productName.trim() : '', line: typeof product.line === 'string' ? product.line.trim() : '', quantity: Number(product.quantity) || 0 }))
      .filter((product) => (product.productId || product.productName) && product.quantity > 0)
    : [];

  const registeredVisit = doctorId
    ? await VisitModel.create({
      userId: new Types.ObjectId(req.auth.sub),
      clientType: 'doctor',
      clientId: doctorId,
      visitedAt: completedAt,
      productsDelivered: deliveredProducts,
      notes: typeof body.finalComments === 'string' ? body.finalComments.trim() : '',
      syncedAt: completedAt,
    })
    : null;

  res.status(201).json({ ok: true, id: visit.id, visitId: registeredVisit?.id, completedAt });
});
