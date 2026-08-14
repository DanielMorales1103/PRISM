import { Schema, model } from 'mongoose';

const SpecialtySchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

SpecialtySchema.index({ code: 1 }, { unique: true });

export const SpecialtyModel = model('Specialty', SpecialtySchema);
