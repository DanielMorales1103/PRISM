import { Schema, model } from 'mongoose';
import { doctorCategories } from '../constants/domain.js';
import { ContactScheduleSchema, LocationSchema } from './common.schema.js';

const DoctorSchema = new Schema(
  {
    assignedUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, enum: doctorCategories, required: true, index: true },
    fullName: { type: String, required: true, trim: true, index: true },
    collegiateNumber: { type: String, trim: true },
    specialtyId: { type: Schema.Types.ObjectId, ref: 'Specialty', index: true },
    subSpecialty: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    hospitalOrClinic: { type: String, trim: true },
    birthDate: { type: Date },
    clinicPhone: { type: String, trim: true },
    mobilePhone: { type: String, trim: true },
    emailOrSocial: { type: String, trim: true },
    specialty: { type: String, trim: true },
    secretaryName: { type: String, trim: true },
    secretaryBirthDate: { type: Date },
    schedule: { type: ContactScheduleSchema },
    location: { type: LocationSchema },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

DoctorSchema.index({ fullName: 'text', collegiateNumber: 'text', address: 'text' });

export const DoctorModel = model('Doctor', DoctorSchema);

