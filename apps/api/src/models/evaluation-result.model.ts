import { Schema, model } from 'mongoose';

const EvaluationResultSchema = new Schema(
  {
    trainingId: { type: Schema.Types.ObjectId, ref: 'Training', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    passed: { type: Boolean, required: true, index: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

EvaluationResultSchema.index({ trainingId: 1, userId: 1, submittedAt: -1 });

export const EvaluationResultModel = model('EvaluationResult', EvaluationResultSchema);
