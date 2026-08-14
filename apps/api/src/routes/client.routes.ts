import { Router } from 'express';
import { DoctorModel } from '../models/doctor.model.js';
import { InstitutionModel } from '../models/institution.model.js';
import { PharmacyModel } from '../models/pharmacy.model.js';

export const clientRouter = Router();

clientRouter.get('/', async (_req, res, next) => {
  try {
    const [doctors, pharmacies, institutions] = await Promise.all([
      DoctorModel.find().sort({ fullName: 1 }).lean(),
      PharmacyModel.find().sort({ name: 1 }).lean(),
      InstitutionModel.find().sort({ name: 1 }).lean(),
    ]);

    res.json({
      doctors: doctors.map((doctor) => ({
        id: doctor._id.toString(),
        type: 'doctor',
        name: doctor.fullName,
        category: doctor.category,
        address: doctor.address,
        specialtyId: doctor.specialtyId?.toString(),
        assignedUserId: doctor.assignedUserId?.toString(),
        location: doctor.location,
        active: doctor.active,
      })),
      pharmacies: pharmacies.map((pharmacy) => ({
        id: pharmacy._id.toString(),
        type: 'pharmacy',
        name: pharmacy.name,
        category: pharmacy.category,
        address: pharmacy.address,
        assignedUserId: pharmacy.assignedUserId?.toString(),
        location: pharmacy.location,
        active: pharmacy.active,
      })),
      institutions: institutions.map((institution) => ({
        id: institution._id.toString(),
        type: 'institution',
        name: institution.name,
        category: institution.category,
        address: institution.address,
        assignedUserId: institution.assignedUserId?.toString(),
        location: institution.location,
        active: institution.active,
      })),
    });
  } catch (error) {
    next(error);
  }
});
