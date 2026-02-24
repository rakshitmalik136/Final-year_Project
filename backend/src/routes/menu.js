const express = require("express");
const { z } = require("zod");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const { validate } = require("../middleware/validate");

const router = express.Router();

const querySchema = z.object({
  category: z.string().trim().min(1).optional()
});

router.get(
  "/",
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    const values = [];
    let sql =
      "SELECT p.id, p.name, p.description, p.price, p.image_url, c.name AS category " +
      "FROM products p JOIN categories c ON p.category_id = c.id " +
      "WHERE p.is_active = TRUE";

    if (category) {
      values.push(category);
      sql += " AND LOWER(c.name) = LOWER($1)";
    }

    sql += " ORDER BY c.name ASC, p.name ASC";

    const result = await db.query(sql, values);
    res.json({ data: result.rows });
  })
);

module.exports = router;
