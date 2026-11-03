import { Schema, model } from 'mongoose';

const MarketingAssetSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: ['cover', 'presentation'], required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    fileName: { type: String, required: true, trim: true },
    contentType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    storagePath: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

MarketingAssetSchema.index({ productId: 1, type: 1, version: 1 }, { unique: true });

export const MarketingAssetModel = model('MarketingAsset', MarketingAssetSchema);
