import { Schema, model } from 'mongoose';

const TrainingSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    resourceUrl: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const TrainingModel = model('Training', TrainingSchema);
