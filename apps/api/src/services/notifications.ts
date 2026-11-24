import { Types } from 'mongoose';
import { NotificationModel, PushDeviceModel } from '../models/notification.model.js';
import { UserModel } from '../models/user.model.js';

type Kind = 'return' | 'training' | 'exam';

export async function notifyRoles(roles: string[], kind: Kind, sourceId: string, title: string, body: string) {
  const users = await UserModel.find({ role: { $in: roles }, active: true }).select('_id').lean();
  const created = await Promise.all(users.map(async (user) => {
    const result = await NotificationModel.updateOne(
      { userId: user._id, kind, sourceId },
      { $setOnInsert: { userId: user._id, kind, sourceId, title, body } },
      { upsert: true },
    );
    return result.upsertedId ? user._id : null;
  }));
  const recipientIds = created.filter((id): id is Types.ObjectId => id !== null);
  if (!recipientIds.length) return;

  const devices = await PushDeviceModel.find({ userId: { $in: recipientIds } }).select('token').lean();
  if (!devices.length) return;
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(devices.map((device) => ({ to: device.token, title, body, sound: 'default', data: { kind, sourceId } }))),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.warn('Expo push request failed:', response.status);
  } catch (error) {
    console.warn('Expo push unavailable; in-app notifications remain queued.', error);
  }
}
