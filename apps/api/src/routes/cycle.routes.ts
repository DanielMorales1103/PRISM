import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';
import { VisitPlanModel } from '../models/visit-plan.model.js';

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

function isMonday(value: Date) {
  return value.getDay() === 1;
}

function cycleEnd(startsAt: Date) {
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + 34);
  endsAt.setHours(23, 59, 59, 999);
  return endsAt;
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
    const endsAt = cycleEnd(startsAt);
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

cycleRouter.patch('/:id', requireAuth, requireRoles('jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const cycle = await CycleModel.findById(req.params.id).lean();
    if (!cycle) {
      res.status(404).json({ message: 'Ciclo no encontrado.' });
      return;
    }

    const rawStart = typeof req.body?.startsAt === 'string' ? req.body.startsAt.trim() : '';
    const startsAt = new Date(`${rawStart}T00:00:00`);
    if (!rawStart || Number.isNaN(startsAt.getTime())) {
      res.status(400).json({ message: 'Selecciona una fecha inicial válida.' });
      return;
    }
    if (!isMonday(startsAt)) {
      res.status(400).json({ message: 'Cada ciclo debe iniciar un lunes.' });
      return;
    }

    const affectedCycles = await CycleModel.find({ number: { $gte: cycle.number } }).sort({ number: 1 });
    let nextStart = startsAt;
    const updated = [];

    for (const currentCycle of affectedCycles) {
      const previousStart = new Date(currentCycle.startsAt);
      const nextEnd = cycleEnd(nextStart);
      currentCycle.startsAt = nextStart;
      currentCycle.endsAt = nextEnd;
      await currentCycle.save();

      const plans = await VisitPlanModel.find({ cycleId: currentCycle._id, status: { $in: ['planned', 'rescheduled'] } });
      for (const plan of plans) {
        const original = new Date(plan.plannedDate);
        const weekdayFromMonday = (original.getDay() + 6) % 7;
        const shifted = new Date(nextStart);
        shifted.setDate(shifted.getDate() + ((plan.weekNumber - 1) * 7) + weekdayFromMonday);
        shifted.setHours(original.getHours(), original.getMinutes(), 0, 0);
        plan.plannedDate = shifted;
        await plan.save();
      }

      updated.push(serializeCycle(currentCycle));
      nextStart = new Date(nextEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      nextStart.setHours(0, 0, 0, 0);
    }

    res.json({ cycles: updated });
  } catch (error) {
    next(error);
  }
});
