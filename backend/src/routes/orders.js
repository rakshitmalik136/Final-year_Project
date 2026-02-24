const express = require("express");
const { z } = require("zod");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const { validate } = require("../middleware/validate");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  formatOrderStatusMessage,
  sendWhatsAppMessage
} = require("../services/whatsapp");

const router = express.Router();

const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled"
];

const orderIdSchema = z.object({
  orderId: z.coerce.number().int().positive()
});

const orderSchema = z.object({
  sessionId: z.string().trim().min(6).max(64),
  customerName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  address: z.string().trim().min(5).max(200),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  whatsappOptIn: z.boolean().optional()
});

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES)
});

router.post(
  "/",
  validate({ body: orderSchema }),
  asyncHandler(async (req, res) => {
    const { sessionId, customerName, phone, address, notes } = req.body;
    const whatsappOptIn = Boolean(req.body.whatsappOptIn);

    const cartResult = await db.query(
      "SELECT id FROM carts WHERE session_id = $1",
      [sessionId]
    );

    if (!cartResult.rows.length) {
      return res.status(400).json({ error: { message: "Cart is empty" } });
    }

    const cartId = cartResult.rows[0].id;
    const itemsResult = await db.query(
      "SELECT ci.product_id, ci.quantity, ci.unit_price, p.name " +
        "FROM cart_items ci JOIN products p ON ci.product_id = p.id " +
        "WHERE ci.cart_id = $1",
      [cartId]
    );

    if (!itemsResult.rows.length) {
      return res.status(400).json({ error: { message: "Cart is empty" } });
    }

    const items = itemsResult.rows.map((row) => ({
      productId: row.product_id,
      name: row.name,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      lineTotal: Number(row.unit_price) * row.quantity
    }));

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = 0;
    const total = subtotal + tax;

    const orderResult = await db.query(
      "INSERT INTO orders (session_id, customer_name, phone, address, notes, whatsapp_opt_in, subtotal, tax, total, status) " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, created_at",
      [
        sessionId,
        customerName,
        phone,
        address,
        notes || null,
        whatsappOptIn,
        subtotal,
        tax,
        total,
        "placed"
      ]
    );

    const orderId = orderResult.rows[0].id;

    const insertItemPromises = items.map((item) =>
      db.query(
        "INSERT INTO order_items (order_id, product_id, name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)",
        [orderId, item.productId, item.name, item.quantity, item.unitPrice]
      )
    );

    await Promise.all(insertItemPromises);

    await db.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    if (whatsappOptIn) {
      try {
        await sendWhatsAppMessage({
          to: phone,
          body: formatOrderStatusMessage({
            orderId,
            status: "placed",
            customerName
          })
        });
      } catch (error) {
        console.error("WhatsApp send failed:", error.message);
      }
    }

    res.status(201).json({
      data: {
        orderId,
        createdAt: orderResult.rows[0].created_at,
        customerName,
        phone,
        address,
        notes: notes || "",
        whatsappOptIn,
        items,
        totals: { subtotal, tax, total },
        status: "placed"
      }
    });
  })
);

router.patch(
  "/:orderId/status",
  requireAdmin,
  validate({ params: orderIdSchema, body: statusSchema }),
  asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const updateResult = await db.query(
      "UPDATE orders SET status = $1 WHERE id = $2 " +
        "RETURNING id, status, customer_name, phone, whatsapp_opt_in",
      [status, orderId]
    );

    if (!updateResult.rows.length) {
      return res.status(404).json({ error: { message: "Order not found" } });
    }

    const order = updateResult.rows[0];

    if (order.whatsapp_opt_in) {
      try {
        await sendWhatsAppMessage({
          to: order.phone,
          body: formatOrderStatusMessage({
            orderId: order.id,
            status: order.status,
            customerName: order.customer_name
          })
        });
      } catch (error) {
        console.error("WhatsApp send failed:", error.message);
      }
    }

    res.json({
      data: {
        orderId: order.id,
        status: order.status,
        whatsappOptIn: order.whatsapp_opt_in
      }
    });
  })
);

module.exports = router;
