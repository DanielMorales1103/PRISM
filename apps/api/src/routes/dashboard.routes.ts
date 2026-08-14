import { Router } from 'express';
import { DoctorModel } from '../models/doctor.model.js';
import { InstitutionModel } from '../models/institution.model.js';
import { PharmacyModel } from '../models/pharmacy.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';
import { VisitModel } from '../models/visit.model.js';
import { VisitPlanModel } from '../models/visit-plan.model.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    const [
      activeUsers,
      activeProducts,
      activeDoctors,
      activePharmacies,
      activeInstitutions,
      plannedVisits,
      completedVisits,
    ] = await Promise.all([
      UserModel.countDocuments({ active: true }),
      ProductModel.countDocuments({ active: true }),
      DoctorModel.countDocuments({ active: true }),
      PharmacyModel.countDocuments({ active: true }),
      InstitutionModel.countDocuments({ active: true }),
      VisitPlanModel.countDocuments({ status: 'planned' }),
      VisitModel.countDocuments(),
    ]);

    const totalClients = activeDoctors + activePharmacies + activeInstitutions;
    const coverage = plannedVisits > 0 ? Math.round((completedVisits / plannedVisits) * 100) : 0;

    res.json({
      activeUsers,
      activeProducts,
      totalClients,
      activeDoctors,
      activePharmacies,
      activeInstitutions,
      plannedVisits,
      completedVisits,
      coverage,
    });
  } catch (error) {
    next(error);
  }
});
