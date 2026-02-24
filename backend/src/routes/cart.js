const express = require("express");
const { z } = require("zod");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const { validate } = require("../middleware/validate");

const router = express.Router();

const sessionParamSchema = z.object({
  sessionId: z.string().trim().min(6).max(64)
});

const itemParamSchema = z.object({
  sessionId: z.string().trim().min(6).max(64),
  itemId: z.coerce.number().int().positive()
});

const addItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().max(20)
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20)
});

const getOrCreateCartId = async (sessionId) => {
  const existing = await db.query(
    "SELECT id FROM carts WHERE session_id = $1",
    [sessionId]
  );

  if (existing.rows.length) {
    return existing.rows[0].id;
  }

  const created = await db.query(
    "INSERT INTO carts (session_id) VALUES ($1) RETURNING id",
    [sessionId]
  );

  return created.rows[0].id;
};

const getCartPayload = async (sessionId) => {
  const cartResult = await db.query(
    "SELECT id FROM carts WHERE session_id = $1",
    [sessionId]
  );

  if (!cartResult.rows.length) {
    return {
      sessionId,
      items: [],
      totals: { subtotal: 0, tax: 0, total: 0 }
    };
  }

  const cartId = cartResult.rows[0].id;
  const itemsResult = await db.query(
    "SELECT ci.id, ci.quantity, ci.unit_price, p.id AS product_id, p.name, p.description, p.image_url " +
      "FROM cart_items ci JOIN products p ON ci.product_id = p.id " +
      "WHERE ci.cart_id = $1 ORDER BY ci.id ASC",
    [cartId]
  );

  const items = itemsResult.rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.unit_price) * row.quantity
  }));

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = 0;
  const total = subtotal + tax;

  return {
    sessionId,
    items,
    totals: { subtotal, tax, total }
  };
};

router.get(
  "/:sessionId",
  validate({ params: sessionParamSchema }),
  asyncHandler(async (req, res) => {
    const cart = await getCartPayload(req.params.sessionId);
    res.json({ data: cart });
  })
);

router.post(
  "/:sessionId/items",
  validate({ params: sessionParamSchema, body: addItemSchema }),
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { productId, quantity } = req.body;

    const productResult = await db.query(
      "SELECT id, price FROM products WHERE id = $1 AND is_active = TRUE",
      [productId]
    );

    if (!productResult.rows.length) {
      return res.status(404).json({ error: { message: "Product not found" } });
    }

    const cartId = await getOrCreateCartId(sessionId);

    const existingItem = await db.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cartId, productId]
    );

    if (existingItem.rows.length) {
      const current = existingItem.rows[0];
      const newQuantity = current.quantity + quantity;
      if (newQuantity > 20) {
        return res
          .status(400)
          .json({ error: { message: "Quantity limit is 20" } });
      }
      await db.query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2",
        [newQuantity, current.id]
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)",
        [cartId, productId, quantity, productResult.rows[0].price]
      );
    }

    const cart = await getCartPayload(sessionId);
    res.status(201).json({ data: cart });
  })
);

router.patch(
  "/:sessionId/items/:itemId",
  validate({ params: itemParamSchema, body: updateItemSchema }),
  asyncHandler(async (req, res) => {
    const { sessionId, itemId } = req.params;
    const { quantity } = req.body;

    const cartResult = await db.query(
      "SELECT id FROM carts WHERE session_id = $1",
      [sessionId]
    );

    if (!cartResult.rows.length) {
      return res.status(404).json({ error: { message: "Cart not found" } });
    }

    const cartId = cartResult.rows[0].id;

    if (quantity <= 0) {
      await db.query(
        "DELETE FROM cart_items WHERE id = $1 AND cart_id = $2",
        [itemId, cartId]
      );
    } else {
      const updateResult = await db.query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3",
        [quantity, itemId, cartId]
      );

      if (!updateResult.rowCount) {
        return res.status(404).json({ error: { message: "Item not found" } });
      }
    }

    const cart = await getCartPayload(sessionId);
    res.json({ data: cart });
  })
);

router.delete(
  "/:sessionId/items/:itemId",
  validate({ params: itemParamSchema }),
  asyncHandler(async (req, res) => {
    const { sessionId, itemId } = req.params;

    const cartResult = await db.query(
      "SELECT id FROM carts WHERE session_id = $1",
      [sessionId]
    );

    if (!cartResult.rows.length) {
      return res.status(404).json({ error: { message: "Cart not found" } });
    }

    const cartId = cartResult.rows[0].id;
    const deleteResult = await db.query(
      "DELETE FROM cart_items WHERE id = $1 AND cart_id = $2",
      [itemId, cartId]
    );

    if (!deleteResult.rowCount) {
      return res.status(404).json({ error: { message: "Item not found" } });
    }

    const cart = await getCartPayload(sessionId);
    res.json({ data: cart });
  })
);

module.exports = router;
