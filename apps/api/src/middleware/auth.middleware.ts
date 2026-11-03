import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRoles } from '../constants/domain.js';
import { UserModel } from '../models/user.model.js';

type UserRole = (typeof userRoles)[number];

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  auth?: TokenPayload;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const tokenPayload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const user = await UserModel.findOne({ _id: tokenPayload.sub, active: true }).lean();
    if (!user) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    req.auth = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role as UserRole,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    next(error);
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
