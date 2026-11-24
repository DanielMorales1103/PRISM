import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';
import { DoctorModel } from '../models/doctor.model.js';
import { ExamAttemptModel } from '../models/exam-attempt.model.js';
import { ExamModel } from '../models/exam.model.js';
import { InstitutionModel } from '../models/institution.model.js';
import { InvoiceModel } from '../models/invoice.model.js';
import { KpiTargetModel } from '../models/kpi-target.model.js';
import { PharmacyModel } from '../models/pharmacy.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import { VisitModel } from '../models/visit.model.js';
import { VisitPlanModel } from '../models/visit-plan.model.js';

export const dashboardRouter = Router();

type Goals = { doctorVisits: number; pharmacyVisits: number; salesAmount: number; collectionAmount: number };
const emptyGoals = (): Goals => ({ doctorVisits: 0, pharmacyVisits: 0, salesAmount: 0, collectionAmount: 0 });

function canViewTeam(role: string | undefined) {
  return role === 'admin' || role === 'jefe' || role === 'supervisor' || role === 'facturacion' || role === 'secretaria';
}

function addGoals(target: Goals, source: Partial<Goals> | undefined) {
  target.doctorVisits += Number(source?.doctorVisits ?? 0);
  target.pharmacyVisits += Number(source?.pharmacyVisits ?? 0);
  target.salesAmount += Number(source?.salesAmount ?? 0);
  target.collectionAmount += Number(source?.collectionAmount ?? 0);
}

function percentage(actual: number, goal: number) {
  return goal > 0 ? Math.round((actual / goal) * 1000) / 10 : 0;
}

function weekOfCycle(value: Date, startsAt: Date, durationWeeks: number) {
  const week = Math.floor((value.getTime() - startsAt.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(durationWeeks, Math.max(1, week));
}

function cycleWeeks(cycle: { startsAt: Date; endsAt: Date; durationWeeks?: number | null }) {
  return Number.isInteger(cycle.durationWeeks) && Number(cycle.durationWeeks) > 0
    ? Number(cycle.durationWeeks)
    : Math.max(1, Math.ceil((cycle.endsAt.getTime() - cycle.startsAt.getTime() + 1) / (7 * 24 * 60 * 60 * 1000)));
}

function invoiceTotals(invoice: any) {
  const paid = invoice.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
  const credits = invoice.creditNotes.reduce((sum: number, credit: any) => sum + credit.amount, 0);
  return { paid, credits, balance: Math.max(0, Math.round((invoice.originalAmount - paid - credits) * 100) / 100) };
}

function parseGoalValues(source: any): Goals {
  const goals = {
    doctorVisits: Number(source?.doctorVisits ?? 0), pharmacyVisits: Number(source?.pharmacyVisits ?? 0),
    salesAmount: Number(source?.salesAmount ?? 0), collectionAmount: Number(source?.collectionAmount ?? 0),
  };
  if (Object.values(goals).some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Las metas deben ser numeros positivos.');
  return goals;
}

dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    const [activeUsers, activeProducts, activeDoctors, activePharmacies, activeInstitutions, plannedVisits, completedVisits] = await Promise.all([
      UserModel.countDocuments({ active: true }), ProductModel.countDocuments({ active: true }), DoctorModel.countDocuments({ active: true }),
      PharmacyModel.countDocuments({ active: true }), InstitutionModel.countDocuments({ active: true }), VisitPlanModel.countDocuments({ status: 'planned' }), VisitModel.countDocuments(),
    ]);
    const totalClients = activeDoctors + activePharmacies + activeInstitutions;
    res.json({ activeUsers, activeProducts, totalClients, activeDoctors, activePharmacies, activeInstitutions, plannedVisits, completedVisits, coverage: plannedVisits > 0 ? Math.round((completedVisits / plannedVisits) * 100) : 0 });
  } catch (error) { next(error); }
});

dashboardRouter.get('/kpis', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const cycles = await CycleModel.find().sort({ startsAt: -1 }).lean();
    const requestedCycleId = typeof req.query.cycleId === 'string' ? req.query.cycleId : '';
    const cycle = cycles.find((item) => item._id.toString() === requestedCycleId) ?? cycles.find((item) => item.active) ?? cycles[0];
    if (!cycle) { res.status(404).json({ message: 'No hay ciclos configurados.' }); return; }
    const durationWeeks = cycleWeeks(cycle);

    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    const selectedUserId = canViewTeam(req.auth?.role) && Types.ObjectId.isValid(requestedUserId) ? requestedUserId : canViewTeam(req.auth?.role) ? '' : req.auth!.sub;
    const year = Number(req.query.year) || cycle.startsAt.getUTCFullYear();
    const visitors = await UserModel.find({ role: 'visitador', active: true }).sort({ name: 1 }).lean();
    const visitorIds = selectedUserId ? [new Types.ObjectId(selectedUserId)] : visitors.map((user) => user._id);
    const userFilter = { $in: visitorIds };

    const [visits, targets, invoices, exams] = await Promise.all([
      VisitModel.find({ userId: userFilter, visitedAt: { $gte: cycle.startsAt, $lte: cycle.endsAt } }).lean(),
      KpiTargetModel.find({ userId: userFilter, cycleId: cycle._id }).lean(),
      InvoiceModel.find({ userId: userFilter }).lean(),
      ExamModel.find({ cycleId: cycle._id }).lean(),
    ]);

    const cycleGoals = emptyGoals();
    targets.forEach((target) => addGoals(cycleGoals, target.cycleGoals));
    const weekly = Array.from({ length: durationWeeks }, (_, index) => ({ weekNumber: index + 1, doctorActual: 0, pharmacyActual: 0, doctorGoal: 0, pharmacyGoal: 0, salesActual: 0, salesGoal: 0, collectionActual: 0, collectionGoal: 0 }));
    targets.forEach((target) => target.weeklyGoals.forEach((item: any) => {
      const week = weekly[item.weekNumber - 1];
      if (!week) return;
      week.doctorGoal += item.goals.doctorVisits; week.pharmacyGoal += item.goals.pharmacyVisits; week.salesGoal += item.goals.salesAmount; week.collectionGoal += item.goals.collectionAmount;
    }));
    visits.forEach((visit) => {
      const week = weekly[weekOfCycle(visit.visitedAt, cycle.startsAt, durationWeeks) - 1];
      if (visit.clientType === 'doctor') week.doctorActual += 1;
      if (visit.clientType === 'pharmacy') week.pharmacyActual += 1;
    });
    const salesInvoices = invoices.filter((invoice) => invoice.cycleId.toString() === cycle._id.toString());
    const collectionInvoices = invoices.filter((invoice) => (invoice.collectionCycleId ?? invoice.cycleId).toString() === cycle._id.toString());
    salesInvoices.forEach((invoice) => {
      if (invoice.invoiceDate < cycle.startsAt || invoice.invoiceDate > cycle.endsAt) return;
      const week = weekly[weekOfCycle(invoice.invoiceDate, cycle.startsAt, durationWeeks) - 1];
      week.salesActual += invoice.originalAmount;
    });
    // Cobros se asignan al ciclo en que ocurrió el abono, aunque la factura se haya planificado para otro ciclo de cobro.
    invoices.forEach((invoice) => invoice.payments.forEach((payment: any) => {
      const paidAt = new Date(payment.paidAt);
      if (paidAt < cycle.startsAt || paidAt > cycle.endsAt) return;
      weekly[weekOfCycle(paidAt, cycle.startsAt, durationWeeks) - 1].collectionActual += payment.amount;
    }));

    const doctorVisits = visits.filter((visit) => visit.clientType === 'doctor').length;
    const pharmacyVisits = visits.filter((visit) => visit.clientType === 'pharmacy').length;
    const salesActual = salesInvoices.reduce((sum, invoice) => sum + (invoice.invoiceDate >= cycle.startsAt && invoice.invoiceDate <= cycle.endsAt ? invoice.originalAmount : 0), 0);
    const collectionActual = invoices.reduce((sum, invoice) => sum + invoice.payments.reduce((paid: number, payment: any) => {
      const paidAt = new Date(payment.paidAt);
      return paidAt >= cycle.startsAt && paidAt <= cycle.endsAt ? paid + payment.amount : paid;
    }, 0), 0);
    const creditAmount = collectionInvoices.reduce((sum, invoice) => sum + invoiceTotals(invoice).credits, 0);
    const pendingBalance = collectionInvoices.reduce((sum, invoice) => sum + invoiceTotals(invoice).balance, 0);

    const frequencyVisits = await VisitModel.find({ userId: userFilter, clientType: 'doctor', visitedAt: { $gte: new Date(Date.UTC(year, 0, 1)), $lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) } }).select('clientId cycleId userId visitedAt').lean();
    const doctorCycles = new Map<string, { clientId: string; userId: string; cycles: Set<string> }>();
    frequencyVisits.forEach((visit) => {
      const clientId = visit.clientId.toString();
      const visitUserId = visit.userId.toString();
      const key = `${visitUserId}:${clientId}`;
      const value = doctorCycles.get(key) ?? { clientId, userId: visitUserId, cycles: new Set<string>() };
      const visitCycle = cycles.find((item) => visit.visitedAt >= item.startsAt && visit.visitedAt <= item.endsAt);
      if (visitCycle) value.cycles.add(visitCycle._id.toString());
      doctorCycles.set(key, value);
    });
    const validDoctorCycles = [...doctorCycles.values()].filter((value) => value.cycles.size > 0);
    const frequencyDistribution = validDoctorCycles.reduce<Record<number, number>>((result, value) => { result[value.cycles.size] = (result[value.cycles.size] ?? 0) + 1; return result; }, {});
    const frequencyDoctors = await DoctorModel.find({ _id: { $in: validDoctorCycles.map((value) => new Types.ObjectId(value.clientId)) } }).select('fullName').lean();
    const doctorNames = new Map(frequencyDoctors.map((doctor) => [doctor._id.toString(), doctor.fullName]));
    const visitorNames = new Map(visitors.map((visitor) => [visitor._id.toString(), visitor.name]));
    const frequencyDetails = validDoctorCycles.map((value) => ({ doctorId: value.clientId, doctorName: doctorNames.get(value.clientId) ?? 'Médico eliminado', userId: value.userId, userName: visitorNames.get(value.userId) ?? 'Visitador eliminado', cyclesVisited: value.cycles.size })).sort((a, b) => b.cyclesVisited - a.cyclesVisited || a.doctorName.localeCompare(b.doctorName));

    const examIds = exams.map((exam) => exam._id);
    const attempts = examIds.length ? await ExamAttemptModel.find({ examId: { $in: examIds }, userId: userFilter }).sort({ submittedAt: -1 }).lean() : [];
    const latestAttempts = new Map<string, any>();
    attempts.forEach((attempt) => { const key = `${attempt.examId}:${attempt.userId}`; if (!latestAttempts.has(key)) latestAttempts.set(key, attempt); });
    const evaluations = exams.map((exam) => {
      const values = [...latestAttempts.values()].filter((attempt) => attempt.examId.toString() === exam._id.toString());
      const averageScore = values.length ? Math.round(values.reduce((sum, attempt) => sum + attempt.score, 0) / values.length) : 0;
      const passed = values.filter((attempt) => attempt.passed).length;
      return { id: exam._id.toString(), title: exam.title, passingScore: exam.passingScore, completed: values.length, averageScore, passed, passRate: values.length ? Math.round((passed / values.length) * 100) : 0 };
    });

    const selectedTarget = selectedUserId ? targets.find((target) => target.userId.toString() === selectedUserId) : undefined;
    const revisionUserIds = selectedTarget?.revisions.map((revision: any) => revision.changedBy).filter(Boolean) ?? [];
    const revisionUsers = revisionUserIds.length ? await UserModel.find({ _id: { $in: revisionUserIds } }).select('name').lean() : [];
    const revisionUserNames = new Map(revisionUsers.map((user) => [user._id.toString(), user.name]));
    res.json({
      filters: { cycles: [...cycles].sort((a, b) => a.number - b.number).map((item) => ({ id: item._id.toString(), name: item.name, number: item.number, startsAt: item.startsAt, endsAt: item.endsAt, durationWeeks: cycleWeeks(item), active: item.active })), visitors: visitors.map((visitor) => ({ id: visitor._id.toString(), name: visitor.name })), selectedCycleId: cycle._id.toString(), selectedUserId: selectedUserId || undefined, year },
      summary: {
        doctors: { actual: doctorVisits, goal: cycleGoals.doctorVisits, percentage: percentage(doctorVisits, cycleGoals.doctorVisits) },
        pharmacies: { actual: pharmacyVisits, goal: cycleGoals.pharmacyVisits, percentage: percentage(pharmacyVisits, cycleGoals.pharmacyVisits) },
        sales: { actual: salesActual, goal: cycleGoals.salesAmount, percentage: percentage(salesActual, cycleGoals.salesAmount) },
        collections: { actual: collectionActual, goal: cycleGoals.collectionAmount, percentage: percentage(collectionActual, cycleGoals.collectionAmount), pendingBalance, creditAmount },
      },
      weekly: weekly.map((item) => ({ ...item, doctorPercentage: percentage(item.doctorActual, item.doctorGoal), pharmacyPercentage: percentage(item.pharmacyActual, item.pharmacyGoal), salesPercentage: percentage(item.salesActual, item.salesGoal), collectionPercentage: percentage(item.collectionActual, item.collectionGoal) })),
      frequency: { year, totalDoctors: validDoctorCycles.length, distribution: Object.entries(frequencyDistribution).map(([cyclesVisited, count]) => ({ cyclesVisited: Number(cyclesVisited), count })).sort((a, b) => b.cyclesVisited - a.cyclesVisited), details: frequencyDetails },
      evaluations,
      invoices: { total: collectionInvoices.length, paid: collectionInvoices.filter((invoice) => invoiceTotals(invoice).balance <= 0).length, partial: collectionInvoices.filter((invoice) => { const totals = invoiceTotals(invoice); return totals.balance > 0 && (totals.paid > 0 || totals.credits > 0); }).length, pending: collectionInvoices.filter((invoice) => { const totals = invoiceTotals(invoice); return totals.paid === 0 && totals.credits === 0; }).length },
      target: selectedTarget ? {
        cycleGoals: selectedTarget.cycleGoals,
        weeklyGoals: selectedTarget.weeklyGoals,
        revisionCount: selectedTarget.revisions.length,
        updatedAt: selectedTarget.updatedAt,
        revisions: [...selectedTarget.revisions].reverse().map((revision: any) => ({
          cycleGoals: revision.cycleGoals,
          weeklyGoals: revision.weeklyGoals,
          reason: revision.reason,
          changedAt: revision.changedAt,
          changedBy: revision.changedBy?.toString(),
          changedByName: revisionUserNames.get(revision.changedBy?.toString()) ?? 'Usuario no disponible',
        })),
      } : undefined,
    });
  } catch (error) { next(error); }
});

dashboardRouter.patch('/targets/:userId/:cycleId', requireAuth, requireRoles('admin', 'jefe'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.userId) || !Types.ObjectId.isValid(req.params.cycleId)) { res.status(400).json({ message: 'Visitador o ciclo invalido.' }); return; }
    const [visitor, cycle] = await Promise.all([UserModel.exists({ _id: req.params.userId, role: 'visitador', active: true }), CycleModel.findById(req.params.cycleId).lean()]);
    if (!visitor || !cycle) { res.status(404).json({ message: 'Visitador o ciclo no encontrado.' }); return; }
    const durationWeeks = cycleWeeks(cycle);
    const weeklyGoals = Array.isArray(req.body?.weeklyGoals) ? req.body.weeklyGoals.map((item: any) => ({ weekNumber: Number(item.weekNumber), goals: parseGoalValues(item.goals) })) : [];
    const weekNumbers = new Set(weeklyGoals.map((item: any) => item.weekNumber));
    if (weeklyGoals.length !== durationWeeks || weekNumbers.size !== durationWeeks || weeklyGoals.some((item: any) => !Number.isInteger(item.weekNumber) || item.weekNumber < 1 || item.weekNumber > durationWeeks)) {
      res.status(400).json({ message: 'Debes configurar una meta para cada semana del ciclo.' }); return;
    }
    const cycleGoals = emptyGoals();
    weeklyGoals.forEach((item: any) => addGoals(cycleGoals, item.goals));
    cycleGoals.salesAmount = Math.round(cycleGoals.salesAmount * 100) / 100;
    cycleGoals.collectionAmount = Math.round(cycleGoals.collectionAmount * 100) / 100;
    const reason = String(req.body?.reason ?? '').trim();
    const existing = await KpiTargetModel.findOne({ userId: req.params.userId, cycleId: req.params.cycleId });
    if (existing) {
      existing.revisions.push({ cycleGoals: { ...existing.cycleGoals }, weeklyGoals: existing.weeklyGoals.map((item: any) => item.toObject()), reason: reason || 'Ajuste de metas', changedBy: new Types.ObjectId(req.auth!.sub), changedAt: new Date() } as any);
      existing.cycleGoals = cycleGoals as any; existing.weeklyGoals = weeklyGoals as any; existing.updatedBy = new Types.ObjectId(req.auth!.sub);
      await existing.save();
      res.json({ cycleGoals: existing.cycleGoals, weeklyGoals: existing.weeklyGoals, revisionCount: existing.revisions.length, updatedAt: existing.updatedAt }); return;
    }
    const created = await KpiTargetModel.create({ userId: req.params.userId, cycleId: req.params.cycleId, cycleGoals, weeklyGoals, updatedBy: req.auth!.sub });
    res.status(201).json({ cycleGoals: created.cycleGoals, weeklyGoals: created.weeklyGoals, revisionCount: 0, updatedAt: created.updatedAt });
  } catch (error) {
    if (error instanceof Error) { res.status(400).json({ message: error.message }); return; }
    next(error);
  }
});
