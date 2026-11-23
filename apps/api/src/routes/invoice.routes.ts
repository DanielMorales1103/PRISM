import { Router } from 'express';
import { Types } from 'mongoose';
import { clientTypes } from '../constants/domain.js';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth.middleware.js';
import { CycleModel } from '../models/cycle.model.js';
import { InvoiceModel } from '../models/invoice.model.js';
import { ProductModel } from '../models/product.model.js';
import { UserModel } from '../models/user.model.js';

export const invoiceRouter = Router();

function canViewTeam(role: string | undefined) {
  return role === 'admin' || role === 'jefe' || role === 'supervisor' || role === 'facturacion';
}

function totals(invoice: any) {
  const paidAmount = invoice.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
  const creditedAmount = invoice.creditNotes.reduce((sum: number, credit: any) => sum + credit.amount, 0);
  const balance = Math.max(0, Math.round((invoice.originalAmount - paidAmount - creditedAmount) * 100) / 100);
  return { paidAmount, creditedAmount, balance, status: balance <= 0 ? 'paid' : paidAmount > 0 || creditedAmount > 0 ? 'partial' : 'pending' };
}

function serializeInvoice(invoice: any) {
  return {
    id: invoice._id.toString(), number: invoice.number, userId: invoice.userId.toString(), cycleId: invoice.cycleId.toString(),
    collectionCycleId: (invoice.collectionCycleId ?? invoice.cycleId).toString(),
    clientType: invoice.clientType, clientId: invoice.clientId.toString(), clientName: invoice.clientName,
    invoiceDate: invoice.invoiceDate, originalAmount: invoice.originalAmount, items: invoice.items ?? [],
    payments: invoice.payments.map((payment: any) => ({ id: payment._id.toString(), amount: payment.amount, paidAt: payment.paidAt, reference: payment.reference })),
    creditNotes: invoice.creditNotes.map((credit: any) => ({ id: credit._id.toString(), number: credit.number, amount: credit.amount, appliedAt: credit.appliedAt, returnId: credit.returnId?.toString() })),
    returns: (invoice.returns ?? []).map((entry: any) => ({
      id: entry._id.toString(), number: entry.number, requestedAt: entry.requestedAt,
      requestedBy: entry.requestedBy.toString(), status: entry.status, items: entry.items,
      reviewedAt: entry.reviewedAt, reviewedBy: entry.reviewedBy?.toString(),
    })),
    ...totals(invoice),
  };
}

invoiceRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    const cycleId = typeof req.query.cycleId === 'string' ? req.query.cycleId : '';
    if (canViewTeam(req.auth?.role)) {
      if (Types.ObjectId.isValid(requestedUserId)) filter.userId = new Types.ObjectId(requestedUserId);
    } else filter.userId = new Types.ObjectId(req.auth!.sub);
    if (Types.ObjectId.isValid(cycleId)) {
      const selectedCycleId = new Types.ObjectId(cycleId);
      filter.$or = [{ cycleId: selectedCycleId }, { collectionCycleId: selectedCycleId }];
    }
    const invoices = await InvoiceModel.find(filter).sort({ invoiceDate: -1 }).limit(1000).lean();
    res.json(invoices.map(serializeInvoice));
  } catch (error) { next(error); }
});

invoiceRouter.get('/returns/report', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const requestedUserId = typeof req.query.userId === 'string' ? req.query.userId : '';
    const cycleId = typeof req.query.cycleId === 'string' ? req.query.cycleId : '';
    const filter: Record<string, unknown> = {};
    if (canViewTeam(req.auth?.role)) {
      if (Types.ObjectId.isValid(requestedUserId)) filter.userId = new Types.ObjectId(requestedUserId);
    } else filter.userId = new Types.ObjectId(req.auth!.sub);
    if (Types.ObjectId.isValid(cycleId)) filter.cycleId = new Types.ObjectId(cycleId);

    const products = new Map<string, { productId: string; productName: string; soldUnits: number; returnedUnits: number }>();
    const recurrence = new Map<string, { clientId: string; clientName: string; productId: string; productName: string; count: number }>();
    const byVisitor = new Map<string, { userId: string; soldUnits: number; returnedUnits: number; creditAmount: number }>();
    const byCycle = new Map<string, { cycleId: string; soldUnits: number; returnedUnits: number; creditAmount: number }>();
    let soldUnits = 0; let returnedUnits = 0; let creditAmount = 0; let untrackedInvoices = 0;
    let pending = 0; let approved = 0; let rejected = 0;
    for await (const invoice of InvoiceModel.find(filter).lean().cursor()) {
      const userId = invoice.userId.toString();
      const saleCycleId = invoice.cycleId.toString();
      const visitor = byVisitor.get(userId) ?? { userId, soldUnits: 0, returnedUnits: 0, creditAmount: 0 };
      const cycle = byCycle.get(saleCycleId) ?? { cycleId: saleCycleId, soldUnits: 0, returnedUnits: 0, creditAmount: 0 };
      if (!invoice.items.length) untrackedInvoices++;
      for (const line of invoice.items) {
        const id = line.productId.toString();
        const product = products.get(id) ?? { productId: id, productName: line.productName, soldUnits: 0, returnedUnits: 0 };
        product.soldUnits += line.quantity;
        products.set(id, product);
        soldUnits += line.quantity; visitor.soldUnits += line.quantity; cycle.soldUnits += line.quantity;
      }
      for (const entry of invoice.returns) {
        if (entry.status === 'pending') pending++;
        if (entry.status === 'rejected') rejected++;
        if (entry.status !== 'approved') continue;
        approved++;
        for (const line of entry.items) {
          const id = line.productId.toString();
          if (!invoice.items.some((sold) => sold.productId.toString() === id)) continue;
          const product = products.get(id) ?? { productId: id, productName: line.productName, soldUnits: 0, returnedUnits: 0 };
          product.returnedUnits += line.returnedQuantity;
          products.set(id, product);
          returnedUnits += line.returnedQuantity; visitor.returnedUnits += line.returnedQuantity; cycle.returnedUnits += line.returnedQuantity;
          const key = `${invoice.clientType}:${invoice.clientId}:${id}`;
          const recurring = recurrence.get(key) ?? { clientId: invoice.clientId.toString(), clientName: invoice.clientName, productId: id, productName: line.productName, count: 0 };
          recurring.count++;
          recurrence.set(key, recurring);
        }
      }
      const credits = invoice.creditNotes.reduce((sum, note) => sum + note.amount, 0);
      creditAmount += credits; visitor.creditAmount += credits; cycle.creditAmount += credits;
      byVisitor.set(userId, visitor); byCycle.set(saleCycleId, cycle);
    }
    const withRate = <T extends { soldUnits: number; returnedUnits: number }>(value: T) => ({ ...value, returnRate: value.soldUnits ? Math.round(value.returnedUnits / value.soldUnits * 1000) / 10 : 0 });
    res.json({ soldUnits, returnedUnits, returnRate: soldUnits ? Math.round(returnedUnits / soldUnits * 1000) / 10 : 0,
      creditAmount, untrackedInvoices, pending, approved, rejected,
      products: [...products.values()].map(withRate).sort((a, b) => b.returnedUnits - a.returnedUnits),
      recurring: [...recurrence.values()].filter((item) => item.count > 1).sort((a, b) => b.count - a.count),
      byVisitor: [...byVisitor.values()].map(withRate), byCycle: [...byCycle.values()].map(withRate),
    });
  } catch (error) { next(error); }
});

invoiceRouter.post('/', requireAuth, requireRoles('admin', 'jefe', 'facturacion'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const number = String(req.body?.number ?? '').trim();
    const userId = String(req.body?.userId ?? '');
    const cycleId = String(req.body?.cycleId ?? '');
    const collectionCycleId = String(req.body?.collectionCycleId ?? cycleId);
    const clientType = String(req.body?.clientType ?? '');
    const clientId = String(req.body?.clientId ?? '');
    const clientName = String(req.body?.clientName ?? '').trim();
    const invoiceDateText = req.body?.invoiceDate;
    const invoiceDate = new Date(typeof invoiceDateText === 'string' ? invoiceDateText : '');
    const items = req.body?.items;
    if (!number || !Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(cycleId) || !Types.ObjectId.isValid(collectionCycleId) || !Types.ObjectId.isValid(clientId) || !clientTypes.includes(clientType as (typeof clientTypes)[number]) || !clientName ||
      typeof invoiceDateText !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDateText) || Number.isNaN(invoiceDate.getTime()) || invoiceDate.toISOString().slice(0, 10) !== invoiceDateText) {
      res.status(400).json({ message: 'Completa los datos validos de la factura.' }); return;
    }
    if (!Array.isArray(items) || !items.length || items.some((item) => !Types.ObjectId.isValid(item?.productId) || !Number.isSafeInteger(item?.quantity) || item.quantity < 1) || new Set(items.map((item) => item.productId.toLowerCase())).size !== items.length) {
      res.status(400).json({ message: 'Registra productos y unidades vendidas válidos en la factura.' }); return;
    }
    const [user, cycle, collectionCycle, products] = await Promise.all([
      UserModel.exists({ _id: userId, role: 'visitador', active: true }),
      CycleModel.findById(cycleId).lean(),
      CycleModel.exists({ _id: collectionCycleId }),
      ProductModel.find({ _id: { $in: items.map((item) => item.productId) }, active: true }).select('name unitPrice').lean(),
    ]);
    if (!user || !cycle || !collectionCycle) { res.status(400).json({ message: 'El visitador o alguno de los ciclos seleccionados no existe.' }); return; }
    if (invoiceDate < cycle.startsAt || invoiceDate > cycle.endsAt) { res.status(400).json({ message: 'La fecha de factura debe estar dentro del ciclo de venta.' }); return; }
    const productById = new Map(products.map((product) => [product._id.toString(), product]));
    if (productById.size !== items.length) { res.status(400).json({ message: 'Todos los productos facturados deben estar activos en el catálogo.' }); return; }
    const invoiceItems = items.map((item) => {
      const product = productById.get(item.productId.toLowerCase())!;
      return { productId: item.productId, productName: product.name, quantity: item.quantity, unitPrice: product.unitPrice ?? 100 };
    });
    if (invoiceItems.some((item) => !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)) {
      res.status(400).json({ message: 'Todos los productos deben tener un precio unitario válido.' }); return;
    }
    const originalAmount = invoiceItems.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0) / 100;
    if (!Number.isSafeInteger(Math.round(originalAmount * 100))) { res.status(400).json({ message: 'El monto calculado de la factura es demasiado grande.' }); return; }
    const invoice = await InvoiceModel.create({ number, userId, cycleId, collectionCycleId, clientType, clientId, clientName, invoiceDate, originalAmount,
      items: invoiceItems });
    res.status(201).json(serializeInvoice(invoice));
  } catch (error: any) {
    if (error?.code === 11000) { res.status(409).json({ message: 'El numero de factura ya existe.' }); return; }
    next(error);
  }
});

invoiceRouter.post('/:id/payments', requireAuth, requireRoles('admin', 'jefe', 'facturacion'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) { res.status(400).json({ message: 'Factura invalida.' }); return; }
    const amount = Number(req.body?.amount);
    const paidAt = new Date(req.body?.paidAt);
    const reference = String(req.body?.reference ?? '').trim();
    if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(paidAt.getTime())) { res.status(400).json({ message: 'Monto y fecha de pago validos son requeridos.' }); return; }
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) { res.status(404).json({ message: 'Factura no encontrada.' }); return; }
    const current = totals(invoice);
    if (amount > current.balance) { res.status(400).json({ message: 'El abono no puede superar el saldo pendiente.' }); return; }
    invoice.payments.push({ amount, paidAt, reference, registeredBy: new Types.ObjectId(req.auth!.sub) } as any);
    await invoice.save();
    res.status(201).json(serializeInvoice(invoice));
  } catch (error) {
    if (error instanceof Error && error.name === 'VersionError') {
      res.status(409).json({ message: 'La factura cambió. Actualiza la cartera e inténtalo de nuevo.' });
      return;
    }
    next(error);
  }
});

invoiceRouter.post('/:id/returns', requireAuth, requireRoles('visitador'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { items } = req.body ?? {};
    if (!Types.ObjectId.isValid(req.params.id) || !Array.isArray(items) || !items.length ||
      items.some((item) => !item || typeof item.productId !== 'string' || !Types.ObjectId.isValid(item.productId) ||
        !Number.isSafeInteger(item.returnedQuantity) || item.returnedQuantity < 1) ||
      new Set(items.map((item) => item.productId.toLowerCase())).size !== items.length) {
      res.status(400).json({ message: 'Ingresa cantidades válidas para cada producto.' });
      return;
    }
    const invoice = await InvoiceModel.findOne({ _id: req.params.id, userId: req.auth!.sub });
    if (!invoice) { res.status(404).json({ message: 'Factura no encontrada.' }); return; }
    if (!invoice.items.length) { res.status(400).json({ message: 'Esta factura anterior no tiene detalle de productos vendidos; facturación debe completarlo antes de solicitar una devolución.' }); return; }
    if (invoice.returns.some((entry) => entry.status === 'pending')) {
      res.status(409).json({ message: 'Esta factura ya tiene una devolución en revisión.' });
      return;
    }
    let sequence = invoice.returns.length + 1;
    let number = `ND-${invoice.number}-${String(sequence).padStart(2, '0')}`;
    while (invoice.returns.some((entry) => entry.number === number)) {
      sequence += 1;
      number = `ND-${invoice.number}-${String(sequence).padStart(2, '0')}`;
    }
    for (const item of items) {
      const soldLine = invoice.items.find((line) => line.productId.toString() === item.productId.toLowerCase());
      if (!soldLine) { res.status(400).json({ message: 'El producto no está registrado en esta factura.' }); return; }
      const previous = invoice.returns
        .filter((entry) => entry.status !== 'rejected')
        .flatMap((entry) => [...entry.items])
        .filter((line) => line.productId.toString() === item.productId.toLowerCase());
      const previouslyReturned = previous.reduce((sum, line) => sum + line.returnedQuantity, 0);
      if (previouslyReturned + item.returnedQuantity > soldLine.quantity) {
        res.status(400).json({ message: 'Verifica las unidades vendidas y las devoluciones anteriores del producto en esta factura.' });
        return;
      }
    }
    const pendingReturnAmount = invoice.returns
      .filter((entry) => entry.status === 'pending')
      .flatMap((entry) => [...entry.items])
      .reduce((sum, item) => {
        const soldLine = invoice.items.find((line) => line.productId.toString() === item.productId.toString());
        return sum + item.returnedQuantity * Number(soldLine?.unitPrice ?? 0);
      }, 0);
    const requestedReturnAmount = items.reduce((sum, item) => {
      const soldLine = invoice.items.find((line) => line.productId.toString() === item.productId.toLowerCase());
      return sum + item.returnedQuantity * Number(soldLine?.unitPrice ?? 0);
    }, 0);
    const availableReturnAmount = Math.max(0, totals(invoice).balance - pendingReturnAmount);
    if (requestedReturnAmount <= 0 || requestedReturnAmount > availableReturnAmount + 0.001) {
      res.status(400).json({ message: `La devolución no puede superar el saldo disponible de Q ${availableReturnAmount.toFixed(2)}.` });
      return;
    }
    const details = items.map(({ productId, returnedQuantity, reason }) => ({
      productId: new Types.ObjectId(productId), productName: invoice.items.find((line) => line.productId.toString() === productId.toLowerCase())!.productName,
      soldQuantity: invoice.items.find((line) => line.productId.toString() === productId.toLowerCase())!.quantity,
      returnedQuantity, reason: typeof reason === 'string' ? reason.trim() : undefined,
    }));
    invoice.returns.push({ number, requestedAt: new Date(), requestedBy: new Types.ObjectId(req.auth!.sub), items: details, status: 'pending' });
    await invoice.save();
    res.status(201).json(serializeInvoice(invoice));
  } catch (error) {
    if (error instanceof Error && error.name === 'VersionError') {
      res.status(409).json({ message: 'La factura cambió. Actualiza la cartera e inténtalo de nuevo.' });
      return;
    }
    next(error);
  }
});

invoiceRouter.post('/:id/returns/:returnId/review', requireAuth, requireRoles('admin', 'jefe', 'facturacion'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id) || !Types.ObjectId.isValid(req.params.returnId)) {
      res.status(400).json({ message: 'Factura inválida.' });
      return;
    }
    const invoice = await InvoiceModel.findById(req.params.id);
    const entry = invoice?.returns.id(req.params.returnId);
    if (!invoice || !entry) { res.status(404).json({ message: 'Devolución no encontrada.' }); return; }
    if (entry.status !== 'pending') { res.status(409).json({ message: 'La devolución ya fue revisada.' }); return; }
    const decision = req.body?.decision;
    if (decision !== 'approved' && decision !== 'rejected') {
      res.status(400).json({ message: 'Selecciona aprobar o rechazar.' });
      return;
    }
    entry.reviewedBy = new Types.ObjectId(req.auth!.sub);
    entry.reviewedAt = new Date();
    entry.status = decision;
    if (decision === 'rejected') {
      await invoice.save();
      res.json(serializeInvoice(invoice));
      return;
    }
    const date = req.body?.appliedAt;
    const appliedAt = new Date(typeof date === 'string' ? date : '');
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(appliedAt.getTime()) || appliedAt.toISOString().slice(0, 10) !== date) {
      res.status(400).json({ message: 'Ingresa una fecha válida para la nota de devolución.' });
      return;
    }
    const amount = Math.round(entry.items.reduce((sum, item) => {
      const soldLine = invoice.items.find((line) => line.productId.toString() === item.productId.toString());
      return sum + item.returnedQuantity * Number(soldLine?.unitPrice ?? 0);
    }, 0) * 100) / 100;
    if (amount < 0.01) {
      res.status(400).json({ message: 'No se pudo calcular el monto de crédito de esta devolución.' });
      return;
    }
    if (amount > totals(invoice).balance) {
      res.status(400).json({ message: 'La nota de devolución no puede superar el saldo pendiente.' });
      return;
    }
    let sequence = invoice.creditNotes.length + 1;
    let number = `NC-${invoice.number}-${String(sequence).padStart(2, '0')}`;
    while (invoice.creditNotes.some((credit) => credit.number === number)) {
      sequence += 1;
      number = `NC-${invoice.number}-${String(sequence).padStart(2, '0')}`;
    }
    invoice.creditNotes.push({ number, amount, appliedAt, returnId: entry._id, registeredBy: entry.reviewedBy });
    await invoice.save();
    res.status(201).json(serializeInvoice(invoice));
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) { res.status(409).json({ message: 'Ya existe una nota de crédito con ese número.' }); return; }
    if (error instanceof Error && error.name === 'VersionError') {
      res.status(409).json({ message: 'La factura cambió. Actualiza la cartera e inténtalo de nuevo.' });
      return;
    }
    next(error);
  }
});
