import { Schema, model } from 'mongoose';

const NotificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['return', 'training', 'exam'], required: true },
  sourceId: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  readAt: { type: Date },
}, { timestamps: true });

NotificationSchema.index({ userId: 1, kind: 1, sourceId: 1 }, { unique: true });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const NotificationModel = model('Notification', NotificationSchema);

const PushDeviceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
}, { timestamps: true });

export const PushDeviceModel = model('PushDevice', PushDeviceSchema);
