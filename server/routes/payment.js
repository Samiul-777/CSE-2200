import express from 'express';
import { protect, orgOnly } from '../middleware/auth.js';
import Organization from '../models/Organization.js';
import TemplateTransaction from '../models/TemplateTransaction.js';
import { initiatePayment, validatePayment, TEMPLATE_CATALOG } from '../utils/sslcommerz.js';

const router = express.Router();

// GET /api/payment/templates
router.get('/templates', protect, async (req, res) => {
  try {
    let purchasedTemplates = ['minimal'];
    if (req.user.role === 'organization' || req.user.role === 'admin') {
      const org = await Organization.findOne({ userId: req.user._id });
      if (org) purchasedTemplates = org.purchasedTemplates || ['minimal'];
    }
    const templates = TEMPLATE_CATALOG.map(t => ({
      ...t,
      owned: req.user.role === 'admin' || purchasedTemplates.includes(t.id),
    }));
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payment/initiate
router.post('/initiate', protect, orgOnly, async (req, res) => {
  try {
    const { templateId } = req.body;
    const template = TEMPLATE_CATALOG.find(t => t.id === templateId);
    if (!template) return res.status(400).json({ success: false, message: 'Invalid template' });
    if (template.free) return res.status(400).json({ success: false, message: 'This template is free' });

    const org = await Organization.findOne({ userId: req.user._id });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    if ((org.purchasedTemplates || ['minimal']).includes(templateId)) {
      return res.status(400).json({ success: false, message: 'Template already owned' });
    }

    const orderId = `MASC-TPL-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    const tx = await TemplateTransaction.create({
      organizationId: org._id,
      userId: req.user._id,
      templateId,
      templateName: template.name,
      amount: template.price,
      orderId,
      status: 'pending',
    });

    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const sslRes = await initiatePayment({
      orderId,
      amount: template.price,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: org.phone || '01700000000',
      backendUrl,
      frontendUrl,
    });

    if (!sslRes.GatewayPageURL) {
      await TemplateTransaction.findByIdAndUpdate(tx._id, { status: 'failed' });
      return res.status(502).json({ success: false, message: 'Payment gateway error', detail: sslRes.failedreason });
    }

    res.json({ success: true, gatewayUrl: sslRes.GatewayPageURL, orderId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payment/success  (SSLCommerz redirects here)
router.post('/success', async (req, res) => {
  console.log('>>> PAYMENT SUCCESS Webhook Received');
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  
  try {
    const { tran_id, val_id, status } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Some environments return 'SUCCESS' instead of 'VALID'
    if (status !== 'VALID' && status !== 'VALIDATED' && status !== 'SUCCESS') {
      console.log('Payment status check failed. Status was:', status);
      return res.redirect(`${frontendUrl}/dashboard/templates?payment=fail&reason=invalid_status`);
    }

    console.log('Proceeding to validate val_id:', val_id);
    const validation = await validatePayment(val_id);
    console.log('SSLCommerz Validation Response:', JSON.stringify(validation, null, 2));

    if (validation.status !== 'VALID' && validation.status !== 'VALIDATED' && validation.status !== 'SUCCESS') {
      console.log('Validation API rejected the payment.');
      return res.redirect(`${frontendUrl}/dashboard/templates?payment=fail&reason=validation_failed`);
    }

    const tx = await TemplateTransaction.findOne({ orderId: tran_id });
    if (!tx || tx.status === 'completed') {
      console.log('Transaction not found or already completed:', { tran_id, tx });
      return res.redirect(`${frontendUrl}/dashboard/templates?payment=already`);
    }

    await TemplateTransaction.findByIdAndUpdate(tx._id, {
      status: 'completed',
      sslTransactionId: validation.tran_id,
      valId: val_id,
      bankTranId: validation.bank_tran_id,
      cardType: validation.card_type,
      sslResponse: validation,
      completedAt: new Date(),
    });

    await Organization.findByIdAndUpdate(tx.organizationId, {
      $addToSet: { purchasedTemplates: tx.templateId },
    });

    res.redirect(`${frontendUrl}/dashboard/templates?payment=success&template=${tx.templateId}`);
  } catch (err) {
    console.error('Payment success handler error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/templates?payment=fail`);
  }
});

// POST /api/payment/fail
router.post('/fail', async (req, res) => {
  console.log('>>> PAYMENT FAIL Webhook Received');
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  
  const { tran_id } = req.body;
  if (tran_id) {
    await TemplateTransaction.findOneAndUpdate({ orderId: tran_id }, { status: 'failed' });
    console.log('Transaction marked as failed in DB:', tran_id);
  }
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/dashboard/templates?payment=fail`);
});

// POST /api/payment/cancel
router.post('/cancel', async (req, res) => {
  console.log('>>> PAYMENT CANCEL Webhook Received');
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  
  const { tran_id } = req.body;
  if (tran_id) {
    await TemplateTransaction.findOneAndUpdate({ orderId: tran_id }, { status: 'cancelled' });
    console.log('Transaction marked as cancelled in DB:', tran_id);
  }
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/dashboard/templates?payment=cancel`);
});

// POST /api/payment/ipn
router.post('/ipn', async (req, res) => {
  res.sendStatus(200);
});

// GET /api/payment/transactions  (admin)
router.get('/transactions', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const txs = await TemplateTransaction.find().sort({ createdAt: -1 }).lean();
    const userIds = [...new Set(txs.map(t => t.userId?.toString()))];
    const { default: User } = await import('../models/User.js');
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const byUser = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    const enriched = txs.map(t => ({ ...t, user: byUser[t.userId?.toString()] || null }));
    res.json({ success: true, transactions: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
