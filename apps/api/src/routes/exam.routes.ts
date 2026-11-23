import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { ExamAttemptModel } from '../models/exam-attempt.model.js';
import { ExamModel } from '../models/exam.model.js';
import { UserModel } from '../models/user.model.js';
import { CycleModel } from '../models/cycle.model.js';

export const examRouter = Router();

type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';

function canManageExams(role: string | undefined) {
  return role === 'admin' || role === 'jefe';
}

function normalizeAnswer(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function parseCycleId(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) throw new Error('Ciclo invalido.');
  if (!await CycleModel.exists({ _id: value })) throw new Error('El ciclo seleccionado no existe.');
  return new Types.ObjectId(value);
}

function parseQuestion(value: unknown) {
  const source = value as Record<string, unknown>;
  const questionId = typeof source?.id === 'string' && Types.ObjectId.isValid(source.id) ? new Types.ObjectId(source.id) : undefined;
  const prompt = typeof source?.prompt === 'string' ? source.prompt.trim() : '';
  const type = source?.type as QuestionType;
  const options = Array.isArray(source?.options) ? source.options.map((option) => String(option).trim()).filter(Boolean) : [];
  const correctOptionIndexes = Array.isArray(source?.correctOptionIndexes) ? source.correctOptionIndexes.map(Number).filter(Number.isInteger) : [];
  const acceptedAnswers = Array.isArray(source?.acceptedAnswers) ? source.acceptedAnswers.map((answer) => String(answer).trim()).filter(Boolean) : [];

  if (!prompt || !['single_choice', 'multiple_choice', 'short_answer'].includes(type)) throw new Error('Cada pregunta debe tener texto y tipo valido.');
  if (type === 'short_answer') {
    if (!acceptedAnswers.length) throw new Error('La respuesta directa necesita al menos una respuesta valida.');
    return { ...(questionId ? { _id: questionId } : {}), prompt, type, options: [], correctOptionIndexes: [], acceptedAnswers };
  }
  if (options.length < 2 || !correctOptionIndexes.length || correctOptionIndexes.some((index) => index < 0 || index >= options.length)) throw new Error('Las preguntas de seleccion necesitan opciones y respuesta correcta.');
  if (type === 'single_choice' && correctOptionIndexes.length !== 1) throw new Error('La seleccion unica debe tener una sola respuesta correcta.');
  return { ...(questionId ? { _id: questionId } : {}), prompt, type, options, correctOptionIndexes: [...new Set(correctOptionIndexes)].sort((a, b) => a - b), acceptedAnswers: [] };
}

function serializeExam(exam: any, includeAnswers: boolean, latestAttempt?: any) {
  return {
    id: exam._id.toString(),
    cycleId: exam.cycleId?.toString(),
    title: exam.title,
    description: exam.description,
    passingScore: exam.passingScore,
    maxAttempts: exam.maxAttempts ?? 1,
    active: exam.active,
    createdAt: exam.createdAt,
    questions: exam.questions.map((question: any) => ({
      id: question._id.toString(),
      prompt: question.prompt,
      type: question.type,
      options: question.options,
      ...(includeAnswers ? { correctOptionIndexes: question.correctOptionIndexes, acceptedAnswers: question.acceptedAnswers } : {}),
    })),
    latestAttempt: latestAttempt ? { score: latestAttempt.score, correctCount: latestAttempt.correctCount, passed: latestAttempt.passed, submittedAt: latestAttempt.submittedAt } : undefined,
  };
}

examRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const manager = canManageExams(req.auth?.role);
    const [exams, attempts] = await Promise.all([
      ExamModel.find(manager ? {} : { active: true }).sort({ createdAt: -1 }).lean(),
      ExamAttemptModel.find({ userId: new Types.ObjectId(req.auth!.sub) }).sort({ submittedAt: -1 }).lean(),
    ]);
    const latestByExam = new Map<string, any>();
    const attemptsByExam = new Map<string, number>();
    attempts.forEach((attempt) => { const id = attempt.examId.toString(); attemptsByExam.set(id, (attemptsByExam.get(id) ?? 0) + 1); if (!latestByExam.has(id)) latestByExam.set(id, attempt); });
    res.json(exams.map((exam) => ({ ...serializeExam(exam, manager, latestByExam.get(exam._id.toString())), attemptCount: attemptsByExam.get(exam._id.toString()) ?? 0 })));
  } catch (error) {
    next(error);
  }
});

examRouter.post('/', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    const cycleId = await parseCycleId(req.body?.cycleId);
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const passingScore = Number(req.body?.passingScore ?? 70);
    const maxAttempts = Number(req.body?.maxAttempts ?? 1);
    const questions = Array.isArray(req.body?.questions) ? req.body.questions.map(parseQuestion) : [];
    if (!title || !questions.length || !Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
      res.status(400).json({ message: 'Titulo, preguntas y nota minima valida son requeridos.' });
      return;
    }
    const exam = await ExamModel.create({ cycleId, title, description, passingScore, maxAttempts, questions, active: true });
    res.status(201).json(serializeExam(exam, true));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

examRouter.patch('/:id', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Examen invalido.' });
      return;
    }
    const cycleId = await parseCycleId(req.body?.cycleId);
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const passingScore = Number(req.body?.passingScore ?? 70);
    const maxAttempts = Number(req.body?.maxAttempts ?? 1);
    const questions = Array.isArray(req.body?.questions) ? req.body.questions.map(parseQuestion) : [];
    if (!title || !questions.length || !Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
      res.status(400).json({ message: 'Titulo, preguntas y nota minima valida son requeridos.' });
      return;
    }
    const exam = await ExamModel.findByIdAndUpdate(req.params.id, { $set: { cycleId, title, description, passingScore, maxAttempts, questions } }, { new: true });
    if (!exam) {
      res.status(404).json({ message: 'Examen no encontrado.' });
      return;
    }
    res.json(serializeExam(exam, true));
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
      return;
    }
    next(error);
  }
});

examRouter.patch('/:id/status', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Examen invalido.' });
      return;
    }
    if (typeof req.body?.active !== 'boolean') {
      res.status(400).json({ message: 'El estado del examen es requerido.' });
      return;
    }
    const exam = await ExamModel.findByIdAndUpdate(
      req.params.id,
      { $set: { active: req.body.active } },
      { new: true },
    );
    if (!exam) {
      res.status(404).json({ message: 'Examen no encontrado.' });
      return;
    }
    res.json(serializeExam(exam, true));
  } catch (error) {
    next(error);
  }
});

examRouter.get('/:id/results', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Examen invalido.' });
      return;
    }
    const [exam, attempts] = await Promise.all([
      ExamModel.findById(req.params.id).lean(),
      ExamAttemptModel.find({ examId: new Types.ObjectId(req.params.id) }).sort({ submittedAt: -1 }).lean(),
    ]);
    if (!exam) {
      res.status(404).json({ message: 'Examen no encontrado.' });
      return;
    }
    const latestByUser = new Map<string, any>();
    attempts.forEach((attempt) => { if (!latestByUser.has(attempt.userId.toString())) latestByUser.set(attempt.userId.toString(), attempt); });
    const userIds = [...latestByUser.keys()].map((id) => new Types.ObjectId(id));
    const users = await UserModel.find({ _id: { $in: userIds } }).lean();
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));
    const results = [...latestByUser.values()].map((attempt) => {
      const user = usersById.get(attempt.userId.toString());
      return {
        id: attempt._id.toString(),
        userId: attempt.userId.toString(),
        userName: user?.name ?? 'Visitador eliminado',
        userEmail: user?.email ?? '',
        score: attempt.score,
        correctCount: attempt.correctCount,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        answers: attempt.answers.map((answer: any) => ({ questionId: answer.questionId.toString(), selectedOptionIndexes: answer.selectedOptionIndexes, textAnswer: answer.textAnswer, correct: answer.correct })),
      };
    });
    res.json({ exam: serializeExam(exam, true), results });
  } catch (error) {
    next(error);
  }
});

examRouter.post('/:id/submit', requireAuth, requireRoles('visitador'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Examen invalido.' });
      return;
    }
    const exam = await ExamModel.findOne({ _id: req.params.id, active: true }).lean();
    if (!exam) {
      res.status(404).json({ message: 'Examen no disponible.' });
      return;
    }
    const attemptCount = await ExamAttemptModel.countDocuments({ examId: exam._id, userId: new Types.ObjectId(req.auth!.sub) });
    if (attemptCount >= (exam.maxAttempts ?? 1)) {
      res.status(409).json({ message: `Ya alcanzaste el límite de ${exam.maxAttempts ?? 1} intento(s) para este examen.` });
      return;
    }
    const submitted = new Map<string, Record<string, unknown>>();
    if (Array.isArray(req.body?.answers)) req.body.answers.forEach((answer: unknown) => {
      const source = answer as Record<string, unknown>;
      if (typeof source?.questionId === 'string') submitted.set(source.questionId, source);
    });
    const answers = exam.questions.map((question) => {
      const answer = submitted.get(question._id.toString());
      const selectedOptionIndexes = Array.isArray(answer?.selectedOptionIndexes) ? answer.selectedOptionIndexes.map(Number).filter(Number.isInteger).sort((a, b) => a - b) : [];
      const textAnswer = typeof answer?.textAnswer === 'string' ? answer.textAnswer.trim() : '';
      const correct = question.type === 'short_answer'
        ? question.acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalizeAnswer(textAnswer))
        : selectedOptionIndexes.length === question.correctOptionIndexes.length && selectedOptionIndexes.every((index, position) => index === question.correctOptionIndexes[position]);
      return { questionId: question._id, selectedOptionIndexes, textAnswer, correct };
    });
    const correctCount = answers.filter((answer) => answer.correct).length;
    const score = Math.round((correctCount / exam.questions.length) * 100);
    const attempt = await ExamAttemptModel.create({ examId: exam._id, userId: new Types.ObjectId(req.auth!.sub), answers, correctCount, score, passed: score >= exam.passingScore, submittedAt: new Date() });
    res.status(201).json({ score: attempt.score, correctCount: attempt.correctCount, totalQuestions: exam.questions.length, passed: attempt.passed, submittedAt: attempt.submittedAt });
  } catch (error) {
    next(error);
  }
});
