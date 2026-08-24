import { Schema, model } from 'mongoose';
import { institutionCategories } from '../constants/domain.js';
import { ContactScheduleSchema, LocationSchema } from './common.schema.js';

const InstitutionSchema = new Schema(
  {
    assignedUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    category: { type: String, enum: institutionCategories, required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    contactName: { type: String, trim: true },
    phone: { type: String, trim: true },
    emailOrSocial: { type: String, trim: true },
    schedule: { type: ContactScheduleSchema },
    location: { type: LocationSchema },
    active: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

InstitutionSchema.index({ name: 'text', address: 'text', contactName: 'text' });

export const InstitutionModel = model('Institution', InstitutionSchema);

