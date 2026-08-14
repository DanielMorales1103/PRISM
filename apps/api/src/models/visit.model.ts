import { Schema, model } from 'mongoose';
import { clientTypes } from '../constants/domain.js';
import { LocationSchema } from './common.schema.js';

const DeliveredProductSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const VisitSchema = new Schema(
  {
    localId: { type: String, trim: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'VisitPlan' },
    clientType: { type: String, enum: clientTypes, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, required: true, index: true },
    visitedAt: { type: Date, required: true, index: true },
    productsDelivered: [DeliveredProductSchema],
    notes: { type: String, trim: true },
    location: { type: LocationSchema },
    offlineCreatedAt: { type: Date },
    syncedAt: { type: Date, index: true },
  },
  { timestamps: true },
);

VisitSchema.index({ userId: 1, visitedAt: -1 });
VisitSchema.index({ localId: 1, userId: 1 }, { unique: true, sparse: true });

export const VisitModel = model('Visit', VisitSchema);
