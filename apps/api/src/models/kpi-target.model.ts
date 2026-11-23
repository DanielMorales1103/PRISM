import { Schema, model } from 'mongoose';

const GoalValuesSchema = new Schema(
  {
    doctorVisits: { type: Number, min: 0, default: 0 },
    pharmacyVisits: { type: Number, min: 0, default: 0 },
    salesAmount: { type: Number, min: 0, default: 0 },
    collectionAmount: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const WeeklyGoalSchema = new Schema(
  {
    weekNumber: { type: Number, required: true, min: 1, max: 52 },
    goals: { type: GoalValuesSchema, required: true },
  },
  { _id: false },
);

const GoalRevisionSchema = new Schema(
  {
    cycleGoals: { type: GoalValuesSchema, required: true },
    weeklyGoals: { type: [WeeklyGoalSchema], default: [] },
    reason: { type: String, trim: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const KpiTargetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', required: true, index: true },
    cycleGoals: { type: GoalValuesSchema, required: true },
    weeklyGoals: { type: [WeeklyGoalSchema], default: [] },
    revisions: { type: [GoalRevisionSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

KpiTargetSchema.index({ userId: 1, cycleId: 1 }, { unique: true });

export const KpiTargetModel = model('KpiTarget', KpiTargetSchema);
