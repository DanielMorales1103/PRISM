import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware.js';
import { PresentationVisitModel } from '../models/presentation-visit.model.js';
import { VisitModel } from '../models/visit.model.js';
import { VisitPlanModel } from '../models/visit-plan.model.js';
import { SampleInventoryModel } from '../models/sample-inventory.model.js';

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
  const planId = toObjectId(body.planId);
  const userId = new Types.ObjectId(req.auth.sub);

  if (planId) {
    const plan = await VisitPlanModel.findOne({ _id: planId, userId });
    const matchesDoctor = plan?.clientType === 'doctor' && plan.clientId.toString() === doctorId?.toString();

    if (!matchesDoctor || !['planned', 'rescheduled'].includes(plan.status)) {
      res.status(400).json({ message: 'La cita seleccionada ya no puede vincularse a esta visita.' });
      return;
    }
  }

  const samplesDelivered = Array.isArray(body.samplesDelivered)
    ? body.samplesDelivered
      .map((sample) => sample as Record<string, unknown>)
      .map((sample) => ({
        productId: toObjectId(sample.productId),
        productName: typeof sample.productName === 'string' ? sample.productName.trim() : '',
        line: typeof sample.line === 'string' ? sample.line.trim() : '',
        quantity: Number(sample.quantity) || 0,
      }))
      .filter((sample) => sample.productId && sample.quantity > 0)
    : [];

  if (samplesDelivered.length && !doctorId) {
    res.status(400).json({ message: 'Las muestras solo pueden registrarse en una visita a un medico.' });
    return;
  }

  const requestedSamples = new Map<string, number>();
  samplesDelivered.forEach((sample) => {
    const productId = sample.productId!.toString();
    requestedSamples.set(productId, (requestedSamples.get(productId) ?? 0) + sample.quantity);
  });

  if (requestedSamples.size) {
    const inventory = await SampleInventoryModel.find({
      userId,
      productId: { $in: [...requestedSamples.keys()].map((id) => new Types.ObjectId(id)) },
    }).lean();
    const available = new Map(inventory.map((item) => [item.productId.toString(), item.quantity]));
    const unavailable = [...requestedSamples.entries()].find(([productId, quantity]) => (available.get(productId) ?? 0) < quantity);

    if (unavailable) {
      res.status(409).json({ message: 'No hay suficientes muestras disponibles para registrar esta visita.' });
      return;
    }
  }

  const visit = await PresentationVisitModel.create({
    userId,
    planId,
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
    samplesDelivered,
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
      userId,
      planId,
      presentationVisitId: visit._id,
      clientType: 'doctor',
      clientId: doctorId,
      visitedAt: completedAt,
      productsDelivered: deliveredProducts,
      samplesDelivered,
      notes: typeof body.finalComments === 'string' ? body.finalComments.trim() : '',
      syncedAt: completedAt,
    })
    : null;

  for (const [productId, quantity] of requestedSamples) {
    const result = await SampleInventoryModel.updateOne(
      { userId, productId: new Types.ObjectId(productId), quantity: { $gte: quantity } },
      { $inc: { quantity: -quantity } },
    );

    if (result.modifiedCount !== 1) {
      res.status(409).json({ message: 'El inventario de muestras cambio antes de guardar la visita. Intenta nuevamente.' });
      return;
    }
  }

  if (planId && registeredVisit) {
    await VisitPlanModel.updateOne({ _id: planId }, { $set: { status: 'completed' } });
  }

  res.status(201).json({ ok: true, id: visit.id, visitId: registeredVisit?.id, completedAt });
});
