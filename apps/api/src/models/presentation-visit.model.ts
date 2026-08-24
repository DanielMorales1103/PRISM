import { Schema, model } from 'mongoose';

const RequestedProductSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true, trim: true },
    line: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const PresentedFlowSchema = new Schema(
  {
    type: { type: String, enum: ['interactive', 'storytelling', 'clinical'], required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, trim: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  { _id: false },
);

const PresentationVisitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorName: { type: String, trim: true },
    doctorSpecialty: { type: String, trim: true },
    clinic: { type: String, trim: true },
    address: { type: String, trim: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    productName: { type: String, trim: true },
    productLine: { type: String, trim: true },
    presentedFlows: [PresentedFlowSchema],
    finalFlowType: { type: String, enum: ['interactive', 'storytelling', 'clinical'], index: true },
    visitStatus: {
      type: String,
      enum: ['purchase_made', 'follow_up_pending', 'not_interested'],
      required: true,
      index: true,
    },
    requestedProducts: [RequestedProductSchema],
    probablePurchaseDate: { type: String, trim: true },
    competitionDetected: { type: String, trim: true },
    interestLevel: { type: Number, min: 1, max: 5, default: 3 },
    requiresFollowUp: { type: Boolean, default: false },
    urgentRequest: { type: Boolean, default: false },
    finalComments: { type: String, trim: true },
    completedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

PresentationVisitSchema.index({ userId: 1, completedAt: -1 });

export const PresentationVisitModel = model('PresentationVisit', PresentationVisitSchema);
