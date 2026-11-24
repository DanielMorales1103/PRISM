import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware.js';
import { NotificationModel, PushDeviceModel } from '../models/notification.model.js';

export const notificationRouter = Router();

notificationRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const notifications = await NotificationModel.find({ userId: req.auth!.sub, readAt: { $exists: false } }).sort({ createdAt: 1 }).limit(50).lean();
    res.json(notifications.map((item) => ({ id: item._id.toString(), kind: item.kind, title: item.title, body: item.body, createdAt: item.createdAt })));
  } catch (error) { next(error); }
});

notificationRouter.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) { res.status(400).json({ message: 'Aviso inválido.' }); return; }
    const item = await NotificationModel.findOneAndUpdate({ _id: req.params.id, userId: req.auth!.sub }, { $set: { readAt: new Date() } }, { new: true });
    if (!item) { res.status(404).json({ message: 'Aviso no encontrado.' }); return; }
    res.json({ ok: true });
  } catch (error) { next(error); }
});

notificationRouter.post('/devices', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)) { res.status(400).json({ message: 'Token push inválido.' }); return; }
    await PushDeviceModel.findOneAndUpdate({ token }, { $set: { userId: req.auth!.sub } }, { upsert: true, new: true });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

notificationRouter.delete('/devices', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (token) await PushDeviceModel.deleteOne({ token, userId: req.auth!.sub });
    res.json({ ok: true });
  } catch (error) { next(error); }
});
