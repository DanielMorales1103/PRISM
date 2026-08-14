import { Schema, model } from 'mongoose';

const CycleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    number: { type: Number, required: true, min: 1, max: 10 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    active: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

CycleSchema.index({ number: 1 }, { unique: true });

export const CycleModel = model('Cycle', CycleSchema);
