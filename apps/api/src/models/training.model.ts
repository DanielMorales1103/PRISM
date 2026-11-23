import { Schema, model } from 'mongoose';

const TrainingSchema = new Schema(
  {
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    resourceUrl: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const TrainingModel = model('Training', TrainingSchema);
