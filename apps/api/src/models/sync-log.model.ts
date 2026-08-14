import { Schema, model } from 'mongoose';

const SyncLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: String, required: true, trim: true, index: true },
    direction: { type: String, enum: ['push', 'pull'], required: true },
    status: { type: String, enum: ['success', 'partial', 'failed'], required: true, index: true },
    recordsSent: { type: Number, default: 0 },
    recordsReceived: { type: Number, default: 0 },
    message: { type: String, trim: true },
  },
  { timestamps: true },
);

SyncLogSchema.index({ userId: 1, createdAt: -1 });

export const SyncLogModel = model('SyncLog', SyncLogSchema);
