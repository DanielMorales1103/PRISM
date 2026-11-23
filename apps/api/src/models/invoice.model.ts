import { Schema, model } from 'mongoose';
import { clientTypes } from '../constants/domain.js';

const PaymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paidAt: { type: Date, required: true },
    reference: { type: String, trim: true },
    registeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const CreditNoteSchema = new Schema(
  {
    number: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    appliedAt: { type: Date, required: true },
    returnId: { type: Schema.Types.ObjectId },
    registeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const ReturnItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  soldQuantity: { type: Number, required: true, min: 1 },
  returnedQuantity: { type: Number, required: true, min: 1 },
  reason: { type: String, trim: true },
}, { _id: false });

const InvoiceItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, min: 0.01 },
}, { _id: false });

const ReturnRequestSchema = new Schema({
  number: { type: String, required: true, trim: true },
  requestedAt: { type: Date, required: true },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: [ReturnItemSchema], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
});

const InvoiceSchema = new Schema(
  {
    number: { type: String, required: true, trim: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', required: true, index: true },
    collectionCycleId: { type: Schema.Types.ObjectId, ref: 'Cycle', index: true },
    clientType: { type: String, enum: clientTypes, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, required: true, index: true },
    clientName: { type: String, required: true, trim: true },
    invoiceDate: { type: Date, required: true, index: true },
    originalAmount: { type: Number, required: true, min: 0.01 },
    items: { type: [InvoiceItemSchema], default: [] },
    payments: { type: [PaymentSchema], default: [] },
    creditNotes: { type: [CreditNoteSchema], default: [] },
    returns: { type: [ReturnRequestSchema], default: [] },
  },
  { timestamps: true, optimisticConcurrency: true },
);

InvoiceSchema.index({ userId: 1, cycleId: 1, invoiceDate: -1 });
InvoiceSchema.index({ userId: 1, collectionCycleId: 1, invoiceDate: -1 });
InvoiceSchema.index({ 'creditNotes.number': 1 }, { unique: true, sparse: true });

export const InvoiceModel = model('Invoice', InvoiceSchema);
