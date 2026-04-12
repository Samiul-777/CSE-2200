import mongoose from 'mongoose';

const templateTransactionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  templateId: { type: String, required: true },
  templateName: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'BDT' },
  orderId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  sslTransactionId: { type: String },
  valId: { type: String },
  bankTranId: { type: String },
  cardType: { type: String },
  sslResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

export default mongoose.model('TemplateTransaction', templateTransactionSchema);
