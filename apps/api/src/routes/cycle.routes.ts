import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';

export const cycleRouter = Router();

function mondayAtMidnight(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date;
}

function serializeCycle(cycle: any) {
  return {
    id: cycle._id.toString(),
    name: cycle.name,
    number: cycle.number,
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    active: cycle.active,
  };
}

cycleRouter.post('/', requireAuth, requireRoles('jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const latest = await CycleModel.findOne().sort({ endsAt: -1, number: -1 }).lean();
    const requestedStart = typeof req.body?.startsAt === 'string' ? new Date(req.body.startsAt) : null;

    if (requestedStart && Number.isNaN(requestedStart.getTime())) {
      res.status(400).json({ message: 'La fecha inicial del ciclo no es valida.' });
      return;
    }

    const startsAt = latest
      ? mondayAtMidnight(new Date(latest.endsAt.getTime() + 86_400_000))
      : mondayAtMidnight(requestedStart ?? new Date());
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 34);
    endsAt.setHours(23, 59, 59, 999);
    const number = (await CycleModel.countDocuments()) + 1;
    const cycle = await CycleModel.create({
      name: `Ciclo ${number}`,
      number,
      startsAt,
      endsAt,
      active: !latest,
    });

    res.status(201).json(serializeCycle(cycle));
  } catch (error) {
    next(error);
  }
});
