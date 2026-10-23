import { Schema, model } from 'mongoose';

const TrainingCompletionSchema = new Schema(
  {
    trainingId: { type: Schema.Types.ObjectId, ref: 'Training', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    completedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

TrainingCompletionSchema.index({ trainingId: 1, userId: 1 }, { unique: true });

export const TrainingCompletionModel = model('TrainingCompletion', TrainingCompletionSchema);
