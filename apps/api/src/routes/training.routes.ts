import { Router } from 'express';
import { Types } from 'mongoose';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { TrainingCompletionModel } from '../models/training-completion.model.js';
import { TrainingModel } from '../models/training.model.js';

export const trainingRouter = Router();

function canManageTraining(role: string | undefined) {
  return role === 'admin' || role === 'jefe';
}

function isGoogleDriveUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com');
  } catch {
    return false;
  }
}

trainingRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const filter = canManageTraining(req.auth?.role) ? {} : { active: true };
    const [trainings, completions] = await Promise.all([
      TrainingModel.find(filter).sort({ createdAt: -1 }).lean(),
      TrainingCompletionModel.find({ userId: new Types.ObjectId(req.auth!.sub) }).lean(),
    ]);
    const completedByTraining = new Map(completions.map((completion) => [completion.trainingId.toString(), completion.completedAt]));

    res.json(trainings.map((training) => ({
      id: training._id.toString(),
      title: training.title,
      description: training.description,
      resourceUrl: training.resourceUrl,
      active: training.active,
      completedAt: completedByTraining.get(training._id.toString()),
    })));
  } catch (error) {
    next(error);
  }
});

trainingRouter.post('/', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const resourceUrl = typeof req.body?.resourceUrl === 'string' ? req.body.resourceUrl.trim() : '';
    if (!title || !resourceUrl) {
      res.status(400).json({ message: 'Titulo y enlace de Google Drive son requeridos.' });
      return;
    }
    if (!isGoogleDriveUrl(resourceUrl)) {
      res.status(400).json({ message: 'El material debe ser un enlace HTTPS de Google Drive o Google Docs.' });
      return;
    }
    const training = await TrainingModel.create({ title, description, resourceUrl, active: true });
    res.status(201).json({ id: training.id, title: training.title, description: training.description, resourceUrl: training.resourceUrl, active: training.active });
  } catch (error) {
    next(error);
  }
});

trainingRouter.post('/:id/complete', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ message: 'Capacitacion invalida.' });
      return;
    }
    const training = await TrainingModel.findOne({ _id: req.params.id, active: true });
    if (!training) {
      res.status(404).json({ message: 'Capacitacion no disponible.' });
      return;
    }
    const completion = await TrainingCompletionModel.findOneAndUpdate(
      { trainingId: training._id, userId: new Types.ObjectId(req.auth!.sub) },
      { $setOnInsert: { completedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ trainingId: training.id, completedAt: completion.completedAt });
  } catch (error) {
    next(error);
  }
});
