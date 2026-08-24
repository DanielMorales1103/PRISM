import { Schema, model } from 'mongoose';
import { pharmacyCategories } from '../constants/domain.js';
import { ContactScheduleSchema, LocationSchema } from './common.schema.js';

const PharmacySchema = new Schema(
  {
    assignedUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, enum: pharmacyCategories, required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    nit: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },
    purchaseManager: { type: String, trim: true },
    phone: { type: String, trim: true },
    mobilePhone: { type: String, trim: true },
    emailOrSocial: { type: String, trim: true },
    ownerBirthDate: { type: Date },
    schedule: { type: ContactScheduleSchema },
    location: { type: LocationSchema },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

PharmacySchema.index({ name: 'text', nit: 'text', address: 'text' });

export const PharmacyModel = model('Pharmacy', PharmacySchema);

