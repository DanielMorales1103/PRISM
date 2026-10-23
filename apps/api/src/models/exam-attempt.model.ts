import { Schema, model } from 'mongoose';

const ExamAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedOptionIndexes: [{ type: Number, min: 0 }],
    textAnswer: { type: String, trim: true },
    correct: { type: Boolean, required: true },
  },
  { _id: false },
);

const ExamAttemptSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: [ExamAnswerSchema],
    score: { type: Number, required: true, min: 0, max: 100 },
    correctCount: { type: Number, required: true, min: 0 },
    passed: { type: Boolean, required: true, index: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

ExamAttemptSchema.index({ examId: 1, userId: 1, submittedAt: -1 });

export const ExamAttemptModel = model('ExamAttempt', ExamAttemptSchema);
