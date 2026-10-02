import { Router } from 'express';
import { Types } from 'mongoose';
import { doctorCategories, pharmacyCategories } from '../constants/domain.js';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { DoctorModel } from '../models/doctor.model.js';
import { InstitutionModel } from '../models/institution.model.js';
import { PharmacyModel } from '../models/pharmacy.model.js';
import { UserModel } from '../models/user.model.js';

export const clientRouter = Router();

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);

  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getLocation(value: unknown) {
  const candidate = value as { latitude?: unknown; longitude?: unknown } | undefined;
  const latitude = Number(candidate?.latitude);
  const longitude = Number(candidate?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Ubicacion invalida.');
  }

  return { latitude, longitude };
}

function canUpdateLocation(req: AuthenticatedRequest, assignedUserId?: { toString(): string } | null) {
  return req.auth?.role !== 'visitador' || assignedUserId?.toString() === req.auth.sub;
}

function serializeDoctor(doctor: any) {
  return {
    id: doctor._id.toString(),
    type: 'doctor',
    name: doctor.fullName,
    category: doctor.category,
    address: doctor.address,
    collegiateNumber: doctor.collegiateNumber,
    specialtyId: doctor.specialtyId?.toString(),
    specialty: doctor.specialty,
    subSpecialty: doctor.subSpecialty,
    hospitalOrClinic: doctor.hospitalOrClinic,
    birthDate: doctor.birthDate,
    clinicPhone: doctor.clinicPhone,
    mobilePhone: doctor.mobilePhone,
    emailOrSocial: doctor.emailOrSocial,
    secretaryName: doctor.secretaryName,
    secretaryBirthDate: doctor.secretaryBirthDate,
    visitDays: doctor.schedule?.visitDays ?? [],
    visitHours: doctor.schedule?.visitHours,
    assignedUserId: doctor.assignedUserId?.toString(),
    location: doctor.location,
    active: doctor.active,
    deletedAt: doctor.deletedAt,
  };
}

function serializePharmacy(pharmacy: any) {
  return {
    id: pharmacy._id.toString(),
    type: 'pharmacy',
    name: pharmacy.name,
    category: pharmacy.category,
    address: pharmacy.address,
    nit: pharmacy.nit,
    ownerName: pharmacy.ownerName,
    purchaseManager: pharmacy.purchaseManager,
    phone: pharmacy.phone,
    mobilePhone: pharmacy.mobilePhone,
    emailOrSocial: pharmacy.emailOrSocial,
    visitDays: pharmacy.schedule?.visitDays ?? [],
    visitHours: pharmacy.schedule?.visitHours,
    assignedUserId: pharmacy.assignedUserId?.toString(),
    location: pharmacy.location,
    active: pharmacy.active,
    deletedAt: pharmacy.deletedAt,
  };
}

function serializeInstitution(institution: any) {
  return {
    id: institution._id.toString(),
    type: 'institution',
    name: institution.name,
    category: institution.category,
    address: institution.address,
    contactName: institution.contactName,
    phone: institution.phone,
    emailOrSocial: institution.emailOrSocial,
    visitDays: institution.schedule?.visitDays ?? [],
    visitHours: institution.schedule?.visitHours,
    assignedUserId: institution.assignedUserId?.toString(),
    location: institution.location,
    active: institution.active,
    deletedAt: institution.deletedAt,
  };
}

async function getAssignedVisitadorId(value: unknown) {
  const rawId = normalizeText(value);

  if (!rawId) {
    return undefined;
  }

  if (!Types.ObjectId.isValid(rawId)) {
    throw new Error('Visitador invalido.');
  }

  const user = await UserModel.findOne({ _id: rawId, role: 'visitador', active: true }).lean();

  if (!user) {
    throw new Error('Visitador no encontrado o inactivo.');
  }

  return new Types.ObjectId(rawId);
}

clientRouter.get('/', async (_req, res, next) => {
  try {
    const [doctors, pharmacies, institutions] = await Promise.all([
      DoctorModel.find().sort({ fullName: 1 }).lean(),
      PharmacyModel.find().sort({ name: 1 }).lean(),
      InstitutionModel.find().sort({ name: 1 }).lean(),
    ]);

    res.json({
      doctors: doctors.map(serializeDoctor),
      pharmacies: pharmacies.map(serializePharmacy),
      institutions: institutions.map(serializeInstitution),
    });
  } catch (error) {
    next(error);
  }
});

clientRouter.post('/doctors', requireAuth, requireRoles('admin', 'jefe'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const fullName = normalizeText(req.body.fullName ?? req.body.name);
    const address = normalizeText(req.body.address);
    const category = normalizeText(req.body.category).toUpperCase() || 'C';

    if (!fullName || !address) {
      res.status(400).json({ message: 'Nombre y direccion son requeridos.' });
      return;
    }

    if (!doctorCategories.includes(category as (typeof doctorCategories)[number])) {
      res.status(400).json({ message: 'Categoria de medico invalida.' });
      return;
    }

    const doctor = await DoctorModel.create({
      category,
      fullName,
      collegiateNumber: normalizeText(req.body.collegiateNumber),
      specialty: normalizeText(req.body.specialty),
      subSpecialty: normalizeText(req.body.subSpecialty),
      address,
      hospitalOrClinic: normalizeText(req.body.hospitalOrClinic),
      birthDate: normalizeDate(req.body.birthDate),
      clinicPhone: normalizeText(req.body.clinicPhone),
      mobilePhone: normalizeText(req.body.mobilePhone),
      emailOrSocial: normalizeText(req.body.emailOrSocial),
      secretaryName: normalizeText(req.body.secretaryName),
      secretaryBirthDate: normalizeDate(req.body.secretaryBirthDate),
      schedule: {
        visitDays: Array.isArray(req.body.visitDays)
          ? req.body.visitDays.map(normalizeText).filter(Boolean)
          : normalizeText(req.body.visitDays)
            ? [normalizeText(req.body.visitDays)]
            : [],
        visitHours: normalizeText(req.body.visitHours),
      },
      active: true,
    });

    res.status(201).json(serializeDoctor(doctor));
  } catch (error) {
    next(error);
  }
});

clientRouter.post('/pharmacies', requireAuth, requireRoles('admin', 'jefe'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const name = normalizeText(req.body.name);
    const address = normalizeText(req.body.address);
    const rawCategory = normalizeText(req.body.category);
    const category = rawCategory.toLowerCase() === 'cadena' ? 'cadena' : rawCategory.toUpperCase() || 'C';

    if (!name || !address) {
      res.status(400).json({ message: 'Nombre y direccion son requeridos.' });
      return;
    }

    if (!pharmacyCategories.includes(category as (typeof pharmacyCategories)[number])) {
      res.status(400).json({ message: 'Categoria de farmacia invalida.' });
      return;
    }

    const pharmacy = await PharmacyModel.create({
      category,
      name,
      nit: normalizeText(req.body.nit),
      address,
      ownerName: normalizeText(req.body.ownerName),
      purchaseManager: normalizeText(req.body.purchaseManager),
      phone: normalizeText(req.body.phone),
      mobilePhone: normalizeText(req.body.mobilePhone),
      emailOrSocial: normalizeText(req.body.emailOrSocial),
      ownerBirthDate: normalizeDate(req.body.ownerBirthDate),
      schedule: {
        visitDays: Array.isArray(req.body.visitDays)
          ? req.body.visitDays.map(normalizeText).filter(Boolean)
          : normalizeText(req.body.visitDays)
            ? [normalizeText(req.body.visitDays)]
            : [],
        visitHours: normalizeText(req.body.visitHours),
      },
      active: true,
    });

    res.status(201).json(serializePharmacy(pharmacy));
  } catch (error) {
    next(error);
  }
});

clientRouter.delete('/doctors/:id', requireAuth, requireRoles('admin', 'jefe'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const doctor = await DoctorModel.findById(req.params.id);

    if (!doctor) {
      res.status(404).json({ message: 'Medico no encontrado.' });
      return;
    }

    doctor.active = false;
    doctor.deletedAt = new Date();
    doctor.deletedBy = req.auth?.sub ? new Types.ObjectId(req.auth.sub) : undefined;
    await doctor.save();

    res.json(serializeDoctor(doctor));
  } catch (error) {
    next(error);
  }
});

clientRouter.patch('/doctors/:id/assignment', requireAuth, requireRoles('admin', 'jefe', 'supervisor'), async (req, res, next) => {
  try {
    const doctor = await DoctorModel.findById(req.params.id);

    if (!doctor || !doctor.active) {
      res.status(404).json({ message: 'Medico activo no encontrado.' });
      return;
    }

    doctor.assignedUserId = await getAssignedVisitadorId(req.body?.assignedUserId);
    await doctor.save();

    res.json(serializeDoctor(doctor));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Visitador')) {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  }
});

clientRouter.patch('/doctors/:id/location', requireAuth, requireRoles('visitador', 'supervisor', 'jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const doctor = await DoctorModel.findById(req.params.id);

    if (!doctor || !doctor.active) {
      res.status(404).json({ message: 'Medico activo no encontrado.' });
      return;
    }

    if (!canUpdateLocation(req, doctor.assignedUserId)) {
      res.status(403).json({ message: 'Solo puedes registrar ubicaciones de tu cartera.' });
      return;
    }

    doctor.location = getLocation(req.body);
    await doctor.save();
    res.json(serializeDoctor(doctor));
  } catch (error) {
    if (error instanceof Error && error.message === 'Ubicacion invalida.') {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  }
});

clientRouter.delete('/pharmacies/:id', requireAuth, requireRoles('admin', 'jefe'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const pharmacy = await PharmacyModel.findById(req.params.id);

    if (!pharmacy) {
      res.status(404).json({ message: 'Farmacia no encontrada.' });
      return;
    }

    pharmacy.active = false;
    pharmacy.deletedAt = new Date();
    pharmacy.deletedBy = req.auth?.sub ? new Types.ObjectId(req.auth.sub) : undefined;
    await pharmacy.save();

    res.json(serializePharmacy(pharmacy));
  } catch (error) {
    next(error);
  }
});

clientRouter.patch('/pharmacies/:id/assignment', requireAuth, requireRoles('admin', 'jefe', 'supervisor'), async (req, res, next) => {
  try {
    const pharmacy = await PharmacyModel.findById(req.params.id);

    if (!pharmacy || !pharmacy.active) {
      res.status(404).json({ message: 'Farmacia activa no encontrada.' });
      return;
    }

    pharmacy.assignedUserId = await getAssignedVisitadorId(req.body?.assignedUserId);
    await pharmacy.save();

    res.json(serializePharmacy(pharmacy));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Visitador')) {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  }
});

clientRouter.patch('/pharmacies/:id/location', requireAuth, requireRoles('visitador', 'supervisor', 'jefe', 'admin'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const pharmacy = await PharmacyModel.findById(req.params.id);

    if (!pharmacy || !pharmacy.active) {
      res.status(404).json({ message: 'Farmacia activa no encontrada.' });
      return;
    }

    if (!canUpdateLocation(req, pharmacy.assignedUserId)) {
      res.status(403).json({ message: 'Solo puedes registrar ubicaciones de tu cartera.' });
      return;
    }

    pharmacy.location = getLocation(req.body);
    await pharmacy.save();
    res.json(serializePharmacy(pharmacy));
  } catch (error) {
    if (error instanceof Error && error.message === 'Ubicacion invalida.') {
      res.status(400).json({ message: error.message });
      return;
    }

    next(error);
  }
});
