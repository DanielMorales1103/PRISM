import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';
import { VisitPlanModel } from '../models/visit-plan.model.js';

export const cycleRouter = Router();

const defaultDurationWeeks = 5;
const minDurationWeeks = 1;
const maxDurationWeeks = 52;

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
    durationWeeks: cycle.durationWeeks ?? defaultDurationWeeks,
    active: cycle.active,
  };
}

function isMonday(value: Date) {
  return value.getDay() === 1;
}

function cycleEnd(startsAt: Date, durationWeeks: number) {
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + (durationWeeks * 7) - 1);
  endsAt.setHours(23, 59, 59, 999);
  return endsAt;
}

function parseDurationWeeks(value: unknown, fallback = defaultDurationWeeks) {
  if (value === undefined || value === null || value === '') return fallback;
  const durationWeeks = Number(value);
  if (!Number.isInteger(durationWeeks) || durationWeeks < minDurationWeeks || durationWeeks > maxDurationWeeks) {
    throw new Error(`La duración debe ser entre ${minDurationWeeks} y ${maxDurationWeeks} semanas.`);
  }
  return durationWeeks;
}

cycleRouter.post('/', requireAuth, requireRoles('jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const latest = await CycleModel.findOne().sort({ endsAt: -1, number: -1 }).lean();
    const requestedStart = typeof req.body?.startsAt === 'string' ? new Date(req.body.startsAt) : null;

    if (requestedStart && Number.isNaN(requestedStart.getTime())) {
      res.status(400).json({ message: 'La fecha inicial del ciclo no es valida.' });
      return;
    }

    let durationWeeks: number;
    try {
      durationWeeks = parseDurationWeeks(req.body?.durationWeeks);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'La duración del ciclo no es válida.' });
      return;
    }
    const startsAt = latest
      ? mondayAtMidnight(new Date(latest.endsAt.getTime() + 86_400_000))
      : mondayAtMidnight(requestedStart ?? new Date());
    const endsAt = cycleEnd(startsAt, durationWeeks);
    const number = (await CycleModel.countDocuments()) + 1;
    const cycle = await CycleModel.create({
      name: `Ciclo ${number}`,
      number,
      startsAt,
      endsAt,
      durationWeeks,
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

    let durationWeeks: number;
    try {
      durationWeeks = parseDurationWeeks(req.body?.durationWeeks, cycle.durationWeeks ?? defaultDurationWeeks);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'La duración del ciclo no es válida.' });
      return;
    }

    const latestPlan = await VisitPlanModel.findOne({ cycleId: cycle._id, status: { $in: ['planned', 'rescheduled'] } })
      .sort({ weekNumber: -1 })
      .lean();
    if (latestPlan && latestPlan.weekNumber > durationWeeks) {
      res.status(409).json({ message: 'No puedes reducir la duración: este ciclo ya tiene citas planificadas en semanas posteriores.' });
      return;
    }

    const affectedCycles = await CycleModel.find({ number: { $gte: cycle.number } }).sort({ number: 1 });
    let nextStart = startsAt;
    const updated = [];

    for (const currentCycle of affectedCycles) {
      const currentDurationWeeks = currentCycle._id.toString() === cycle._id.toString()
        ? durationWeeks
        : currentCycle.durationWeeks ?? defaultDurationWeeks;
      const nextEnd = cycleEnd(nextStart, currentDurationWeeks);
      currentCycle.startsAt = nextStart;
      currentCycle.endsAt = nextEnd;
      currentCycle.durationWeeks = currentDurationWeeks;
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

cycleRouter.delete('/:id', requireAuth, requireRoles('jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const cycle = await CycleModel.findById(req.params.id).lean();
    if (!cycle) {
      res.status(404).json({ message: 'Ciclo no encontrado.' });
      return;
    }

    const latest = await CycleModel.findOne().sort({ number: -1, endsAt: -1 }).lean();
    if (!latest || latest._id.toString() !== cycle._id.toString()) {
      res.status(409).json({ message: 'Solo se puede eliminar el último ciclo registrado.' });
      return;
    }

    if (await VisitPlanModel.exists({ cycleId: cycle._id })) {
      res.status(409).json({ message: 'No puedes eliminar este ciclo porque tiene citas planificadas. Reprograma o cancela esas citas primero.' });
      return;
    }

    await CycleModel.deleteOne({ _id: cycle._id });
    res.json({ deletedId: cycle._id.toString() });
  } catch (error) {
    next(error);
  }
});
