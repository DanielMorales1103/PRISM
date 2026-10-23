import { Schema, model } from 'mongoose';

const ExamQuestionSchema = new Schema(
  {
    prompt: { type: String, required: true, trim: true },
    type: { type: String, enum: ['single_choice', 'multiple_choice', 'short_answer'], required: true },
    options: [{ type: String, trim: true }],
    correctOptionIndexes: [{ type: Number, min: 0 }],
    acceptedAnswers: [{ type: String, trim: true }],
  },
  { _id: true },
);

const ExamSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    questions: { type: [ExamQuestionSchema], required: true },
    passingScore: { type: Number, required: true, min: 0, max: 100, default: 70 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const ExamModel = model('Exam', ExamSchema);
