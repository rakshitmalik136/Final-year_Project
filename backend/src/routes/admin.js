const express = require("express");
const { z } = require("zod");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const { validate } = require("../middleware/validate");
const { requireAdmin } = require("../middleware/adminAuth");
const { getAdminConfig, isValidCredential, issueAdminToken } = require("../utils/adminAuth");

const router = express.Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128)
});

const toNumber = (value) => Number(value || 0);

const mapOrder = (row) => ({
  orderId: row.id,
  customerName: row.customer_name,
  phone: row.phone,
  address: row.address,
  notes: row.notes || "",
  status: row.status,
  totals: {
    subtotal: toNumber(row.subtotal),
    tax: toNumber(row.tax),
    total: toNumber(row.total)
  },
  createdAt: row.created_at,
  items: Array.isArray(row.items)
    ? row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: toNumber(item.unitPrice),
        lineTotal: toNumber(item.lineTotal)
      }))
    : []
});

router.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const valid = isValidCredential({ username, password });

    if (!valid) {
      return res.status(401).json({
        error: { message: "Invalid admin username or password" }
      });
    }

    const config = getAdminConfig();
    const token = issueAdminToken(username);
    const expiresInSeconds = config.tokenTtlSeconds;

    return res.json({
      data: {
        token,
        username,
        expiresInSeconds
      }
    });
  })
);

router.get(
  "/dashboard",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const summaryResult = await db.query(
      "SELECT " +
        "COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled' AND created_at >= date_trunc('day', NOW())), 0) AS day_earnings, " +
        "COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled' AND created_at >= date_trunc('month', NOW())), 0) AS month_earnings, " +
        "COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled' AND created_at >= date_trunc('year', NOW())), 0) AS year_earnings " +
        "FROM orders"
    );

    const currentOrdersResult = await db.query(
      "SELECT " +
        "o.id, o.customer_name, o.phone, o.address, o.notes, o.status, o.subtotal, o.tax, o.total, o.created_at, " +
        "COALESCE( " +
          "json_agg( " +
            "json_build_object( " +
              "'id', oi.id, " +
              "'productId', oi.product_id, " +
              "'name', oi.name, " +
              "'quantity', oi.quantity, " +
              "'unitPrice', oi.unit_price, " +
              "'lineTotal', oi.unit_price * oi.quantity " +
            ") ORDER BY oi.id ASC " +
          ") FILTER (WHERE oi.id IS NOT NULL), " +
          "'[]'::json " +
        ") AS items " +
      "FROM orders o " +
      "LEFT JOIN order_items oi ON oi.order_id = o.id " +
      "WHERE o.status NOT IN ('delivered', 'cancelled') " +
      "GROUP BY o.id " +
      "ORDER BY o.created_at DESC"
    );

    const currentOrders = currentOrdersResult.rows.map(mapOrder);
    const inTransitOrders = currentOrders.filter(
      (order) => order.status === "out_for_delivery"
    );
    const earnings = summaryResult.rows[0] || {};

    return res.json({
      data: {
        summary: {
          currentOrdersCount: currentOrders.length,
          inTransitOrdersCount: inTransitOrders.length,
          dayEarnings: toNumber(earnings.day_earnings),
          monthEarnings: toNumber(earnings.month_earnings),
          yearEarnings: toNumber(earnings.year_earnings)
        },
        currentOrders,
        inTransitOrders
      }
    });
  })
);

module.exports = router;
