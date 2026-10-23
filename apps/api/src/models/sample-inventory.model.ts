import { Schema, model } from 'mongoose';

const SampleInventorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

SampleInventorySchema.index({ userId: 1, productId: 1 }, { unique: true });

export const SampleInventoryModel = model('SampleInventory', SampleInventorySchema);
