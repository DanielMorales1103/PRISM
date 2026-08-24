import { Schema, model } from 'mongoose';

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    line: { type: String, required: true, trim: true },
    presentation: { type: String, required: true, trim: true },
    composition: { type: String, trim: true },
    dosage: { type: String, trim: true },
    details: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ProductSchema.index({ name: 1 }, { unique: true });

export const ProductModel = model('Product', ProductSchema);
