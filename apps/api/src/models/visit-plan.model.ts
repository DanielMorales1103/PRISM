import { Schema, model } from 'mongoose';
import { clientTypes } from '../constants/domain.js';

const VisitPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', required: true, index: true },
    weekNumber: { type: Number, required: true, min: 1, max: 5, index: true },
    plannedDate: { type: Date, required: true, index: true },
    order: { type: Number, required: true, min: 1 },
    clientType: { type: String, enum: clientTypes, required: true },
    clientId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: { type: String, enum: ['planned', 'completed', 'skipped', 'rescheduled'], default: 'planned', index: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

VisitPlanSchema.index({ userId: 1, plannedDate: 1, order: 1 });

export const VisitPlanModel = model('VisitPlan', VisitPlanSchema);
