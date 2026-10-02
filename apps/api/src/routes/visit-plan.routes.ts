import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';
import { DoctorModel } from '../models/doctor.model.js';
import { PharmacyModel } from '../models/pharmacy.model.js';
import { UserModel } from '../models/user.model.js';
import { VisitPlanModel } from '../models/visit-plan.model.js';

export const visitPlanRouter = Router();

const planStatuses = ['planned', 'completed', 'skipped', 'rescheduled'] as const;
type PlanStatus = (typeof planStatuses)[number];

function isManager(role: string | undefined) {
  return role === 'admin' || role === 'jefe' || role === 'supervisor';
}

function serializePlan(plan: any) {
  return {
    id: plan._id.toString(),
    userId: plan.userId.toString(),
    cycleId: plan.cycleId.toString(),
    weekNumber: plan.weekNumber,
    plannedDate: plan.plannedDate,
    order: plan.order,
    clientType: plan.clientType,
    clientId: plan.clientId.toString(),
    status: plan.status,
    notes: plan.notes,
  };
}

function toObjectId(value: unknown, label: string) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!Types.ObjectId.isValid(raw)) throw new Error(`${label} invalido.`);
  return new Types.ObjectId(raw);
}

function toPlannedDate(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const date = new Date(raw);
  if (!raw || Number.isNaN(date.getTime())) throw new Error('Fecha planificada invalida.');
  return date;
}

async function validateAssignment(clientType: unknown, clientId: Types.ObjectId, userId: Types.ObjectId) {
  const client = clientType === 'doctor'
    ? await DoctorModel.findOne({ _id: clientId, active: true }).lean()
    : clientType === 'pharmacy'
      ? await PharmacyModel.findOne({ _id: clientId, active: true }).lean()
      : null;

  if (!client) throw new Error('Cliente activo no encontrado.');
  if (client.assignedUserId?.toString() !== userId.toString()) {
    throw new Error('El cliente debe estar asignado al visitador seleccionado.');
  }
}

async function buildPlanData(body: Record<string, unknown>, currentUserId: string, manager: boolean) {
  const requestedUserId = body.userId ? toObjectId(body.userId, 'Visitador') : new Types.ObjectId(currentUserId);
  const clientId = toObjectId(body.clientId, 'Cliente');
  const cycleId = toObjectId(body.cycleId, 'Ciclo');
  const clientType = body.clientType === 'doctor' || body.clientType === 'pharmacy' ? body.clientType : '';
  const plannedDate = toPlannedDate(body.plannedDate);

  if (!manager && requestedUserId.toString() !== currentUserId) throw new Error('No puedes planificar visitas para otro visitador.');
  if (!clientType) throw new Error('Tipo de cliente invalido.');

  const [visitador, cycle] = await Promise.all([
    UserModel.findOne({ _id: requestedUserId, role: 'visitador', active: true }).lean(),
    CycleModel.findById(cycleId).lean(),
  ]);
  if (!visitador) throw new Error('Visitador no encontrado o inactivo.');
  if (!cycle || cycle.number > 5) throw new Error('Ciclo no encontrado.');

  await validateAssignment(clientType, clientId, requestedUserId);
  const elapsedDays = Math.floor((plannedDate.getTime() - cycle.startsAt.getTime()) / 86_400_000);

  return {
    userId: requestedUserId,
    cycleId,
    clientId,
    clientType,
    plannedDate,
    weekNumber: Math.min(5, Math.max(1, Math.floor(elapsedDays / 7) + 1)),
    order: Math.max(1, Number(body.order) || 1),
    status: 'planned' as PlanStatus,
    notes: typeof body.notes === 'string' ? body.notes.trim() : '',
  };
}

visitPlanRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const manager = isManager(req.auth?.role);
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const filter: Record<string, unknown> = {};
    if (!manager || requestedUserId) {
      filter.userId = manager && requestedUserId ? toObjectId(requestedUserId, 'Visitador') : new Types.ObjectId(req.auth!.sub);
    }
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;

    if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
      filter.plannedDate = {
        ...(from && !Number.isNaN(from.getTime()) ? { $gte: from } : {}),
        ...(to && !Number.isNaN(to.getTime()) ? { $lte: to } : {}),
      };
    }

    const plans = await VisitPlanModel.find(filter).sort({ plannedDate: 1, order: 1 }).lean();
    res.json(plans.map(serializePlan));
  } catch (error) {
    next(error);
  }
});

visitPlanRouter.post('/', requireAuth, requireRoles('visitador', 'supervisor', 'jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = await buildPlanData(req.body ?? {}, req.auth!.sub, isManager(req.auth?.role));
    const plan = await VisitPlanModel.create(data);
    res.status(201).json(serializePlan(plan));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

visitPlanRouter.patch('/:id', requireAuth, requireRoles('visitador', 'supervisor', 'jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const plan = await VisitPlanModel.findById(req.params.id);
    if (!plan) {
      res.status(404).json({ message: 'Visita planificada no encontrada.' });
      return;
    }
    if (!isManager(req.auth?.role) && plan.userId.toString() !== req.auth!.sub) {
      res.status(403).json({ message: 'No puedes modificar esta visita.' });
      return;
    }

    const body = req.body ?? {};
    if (body.plannedDate !== undefined) plan.plannedDate = toPlannedDate(body.plannedDate);
    if (body.order !== undefined) plan.order = Math.max(1, Number(body.order) || 1);
    if (body.status !== undefined) {
      if (!planStatuses.includes(body.status as PlanStatus)) {
        res.status(400).json({ message: 'Estado de visita invalido.' });
        return;
      }
      plan.status = body.status as PlanStatus;
    }
    if (body.notes !== undefined) plan.notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    await plan.save();
    res.json(serializePlan(plan));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});
