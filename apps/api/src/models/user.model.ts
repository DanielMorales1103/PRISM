import { Schema, model } from 'mongoose';
import { userRoles } from '../constants/domain.js';

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: userRoles, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 }, { unique: true });

export const UserModel = model('User', UserSchema);
