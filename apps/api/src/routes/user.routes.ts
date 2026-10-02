import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { userRoles } from '../constants/domain.js';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { DoctorModel } from '../models/doctor.model.js';
import { PharmacyModel } from '../models/pharmacy.model.js';
import { UserModel } from '../models/user.model.js';

export const userRouter = Router();

function serializeUser(user: any) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    deletedAt: user.deletedAt,
  };
}

userRouter.get('/', async (_req, res, next) => {
  try {
    const users = await UserModel.find().sort({ name: 1 }).lean();

    res.json(
      users.map(serializeUser),
    );
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await UserModel.findOne({ _id: req.auth?.sub, active: true });

    if (!user) {
      res.status(404).json({ message: 'Usuario activo no encontrado.' });
      return;
    }

    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email) {
      res.status(400).json({ message: 'El correo es requerido.' });
      return;
    }

    if (email !== user.email) {
      const existingUser = await UserModel.exists({ _id: { $ne: user._id }, email });
      if (existingUser) {
        res.status(409).json({ message: 'Ese correo ya está registrado.' });
        return;
      }
      user.email = email;
    }

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();
    const profile = serializeUser(user);
    const token = jwt.sign({ sub: profile.id, role: profile.role, email: profile.email }, env.jwtSecret, { expiresIn: '12h' });

    res.json({ token, user: profile });
  } catch (error) {
    next(error);
  }
});

userRouter.post('/', requireAuth, requireRoles('admin', 'jefe'), async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const role = String(req.body?.role ?? '');

    if (!name || !email || !password || !userRoles.includes(role as (typeof userRoles)[number]) || role === 'admin') {
      res.status(400).json({ message: 'Name, email, password and valid role are required' });
      return;
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'Email is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      name,
      email,
      passwordHash,
      role,
      active: true,
    });

    res.status(201).json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt,
    });
  } catch (error) {
    next(error);
  }
});

userRouter.delete('/:id', requireAuth, requireRoles('admin', 'jefe'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user._id.toString() === req.auth?.sub) {
      res.status(400).json({ message: 'You cannot deactivate your own user' });
      return;
    }

    if (user.role === 'admin') {
      res.status(400).json({ message: 'Admin user cannot be deactivated' });
      return;
    }

    user.active = false;
    user.deletedAt = new Date();
    user.deletedBy = req.auth?.sub ? new Types.ObjectId(req.auth.sub) : undefined;
    await user.save();

    if (user.role === 'visitador') {
      await Promise.all([
        DoctorModel.updateMany({ assignedUserId: user._id }, { $unset: { assignedUserId: 1 } }),
        PharmacyModel.updateMany({ assignedUserId: user._id }, { $unset: { assignedUserId: 1 } }),
      ]);
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
      deletedAt: user.deletedAt,
    });
  } catch (error) {
    next(error);
  }
});
