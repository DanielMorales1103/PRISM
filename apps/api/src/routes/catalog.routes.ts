import { Router } from 'express';
import {
  clientTypes,
  doctorCategories,
  institutionCategories,
  pharmacyCategories,
  userRoles,
} from '../constants/domain.js';
import { CycleModel } from '../models/cycle.model.js';
import { SpecialtyModel } from '../models/specialty.model.js';

export const catalogRouter = Router();

catalogRouter.get('/', async (_req, res, next) => {
  try {
    const [specialties, cycles] = await Promise.all([
      SpecialtyModel.find().sort({ name: 1 }).lean(),
      CycleModel.find().sort({ number: 1 }).lean(),
    ]);

    res.json({
      roles: userRoles,
      clientTypes,
      doctorCategories,
      pharmacyCategories,
      institutionCategories,
      specialties: specialties.map((specialty) => ({
        id: specialty._id.toString(),
        code: specialty.code,
        name: specialty.name,
        active: specialty.active,
      })),
      cycles: cycles.map((cycle) => ({
        id: cycle._id.toString(),
        name: cycle.name,
        number: cycle.number,
        startsAt: cycle.startsAt,
        endsAt: cycle.endsAt,
        active: cycle.active,
      })),
    });
  } catch (error) {
    next(error);
  }
});
