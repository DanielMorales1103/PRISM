import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';
import { ExamModel } from '../models/exam.model.js';
import { MarketingAssetModel } from '../models/marketing-asset.model.js';
import { ProductModel } from '../models/product.model.js';
import { TrainingModel } from '../models/training.model.js';

export const libraryRouter = Router();

function canManage(role: string | undefined) {
  return role === 'admin' || role === 'jefe';
}

libraryRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const manager = canManage(req.auth?.role);
    const [cycles, trainings, exams, assets, products] = await Promise.all([
      CycleModel.find().sort({ number: 1 }).lean(),
      TrainingModel.find(manager ? {} : { active: true }).sort({ createdAt: -1 }).lean(),
      ExamModel.find(manager ? {} : { active: true }).sort({ createdAt: -1 }).lean(),
      MarketingAssetModel.find().sort({ createdAt: -1 }).lean(),
      ProductModel.find().sort({ name: 1 }).lean(),
    ]);
    const productsById = new Map(products.map((product) => [product._id.toString(), product]));

    res.json({
      cycles: cycles.map((cycle) => ({
        id: cycle._id.toString(), name: cycle.name, number: cycle.number,
        startsAt: cycle.startsAt, endsAt: cycle.endsAt, active: cycle.active,
      })),
      trainings: trainings.map((training) => ({
        id: training._id.toString(), cycleId: training.cycleId?.toString(), title: training.title,
        description: training.description, resourceUrl: training.resourceUrl,
        active: training.active, createdAt: training.createdAt,
      })),
      exams: exams.map((exam) => ({
        id: exam._id.toString(), cycleId: exam.cycleId?.toString(), title: exam.title,
        description: exam.description, passingScore: exam.passingScore,
        maxAttempts: exam.maxAttempts ?? 1,
        questionCount: exam.questions.length,
          questions: exam.questions.map((question) => ({
          id: question._id.toString(), prompt: question.prompt, type: question.type,
          options: question.options, correctOptionIndexes: question.correctOptionIndexes,
        })),
        active: exam.active, createdAt: exam.createdAt,
      })),
      assets: assets.map((asset) => {
        const product = productsById.get(asset.productId.toString());
        return {
          id: asset._id.toString(), productId: asset.productId.toString(),
          productName: product?.name ?? 'Producto eliminado', productLine: product?.line ?? '',
          type: asset.type, version: asset.version, fileName: asset.fileName,
          contentType: asset.contentType, size: asset.size, active: asset.active,
          createdAt: asset.createdAt,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});
