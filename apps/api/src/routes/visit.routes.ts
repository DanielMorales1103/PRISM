import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware.js';
import { VisitModel } from '../models/visit.model.js';

export const visitRouter = Router();

function canViewTeam(role: string | undefined) {
  return role === 'admin' || role === 'jefe';
}

function toDate(value: unknown, endOfDay = false) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(`${value.trim()}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

visitRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    const requestedClientId = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : '';
    const filter: Record<string, unknown> = {};

    if (canViewTeam(req.auth?.role) && requestedUserId && Types.ObjectId.isValid(requestedUserId)) {
      filter.userId = new Types.ObjectId(requestedUserId);
    } else {
      filter.userId = new Types.ObjectId(req.auth!.sub);
    }
    if (requestedClientId && Types.ObjectId.isValid(requestedClientId)) filter.clientId = new Types.ObjectId(requestedClientId);

    const from = toDate(req.query.from);
    const to = toDate(req.query.to, true);
    if (from || to) filter.visitedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };

    const visits = await VisitModel.find(filter).sort({ visitedAt: -1 }).limit(500).lean();
    res.json(visits.map((visit) => ({
      id: visit._id.toString(),
      clientType: visit.clientType,
      clientId: visit.clientId.toString(),
      userId: visit.userId.toString(),
      visitedAt: visit.visitedAt,
      notes: visit.notes,
      productsDelivered: visit.productsDelivered.map((product) => ({ productId: product.productId?.toString(), quantity: product.quantity })),
      location: visit.location,
      syncedAt: visit.syncedAt,
    })));
  } catch (error) {
    next(error);
  }
});
