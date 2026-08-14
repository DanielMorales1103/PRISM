import { Schema } from 'mongoose';

export const LocationSchema = new Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);

export const ContactScheduleSchema = new Schema(
  {
    visitDays: [{ type: String, trim: true }],
    visitHours: { type: String, trim: true },
  },
  { _id: false },
);
