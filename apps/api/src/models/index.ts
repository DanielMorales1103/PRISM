import { CycleModel } from './cycle.model.js';
import { DoctorModel } from './doctor.model.js';
import { EvaluationResultModel } from './evaluation-result.model.js';
import { InstitutionModel } from './institution.model.js';
import { PharmacyModel } from './pharmacy.model.js';
import { ProductModel } from './product.model.js';
import { SpecialtyModel } from './specialty.model.js';
import { SyncLogModel } from './sync-log.model.js';
import { TrainingModel } from './training.model.js';
import { UserModel } from './user.model.js';
import { VisitPlanModel } from './visit-plan.model.js';
import { VisitModel } from './visit.model.js';

export const models = [
  UserModel,
  ProductModel,
  SpecialtyModel,
  CycleModel,
  DoctorModel,
  PharmacyModel,
  InstitutionModel,
  VisitPlanModel,
  VisitModel,
  TrainingModel,
  EvaluationResultModel,
  SyncLogModel,
] as const;

export async function ensureCollectionsAndIndexes() {
  for (const model of models) {
    await model.createCollection();
    await model.syncIndexes();
  }
}

export function getModelNames() {
  return models.map((model) => model.modelName);
}
