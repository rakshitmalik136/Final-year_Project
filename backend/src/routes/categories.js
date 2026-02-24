const express = require("express");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await db.query(
      "SELECT id, name FROM categories ORDER BY name ASC"
    );
    res.json({ data: result.rows });
  })
);

module.exports = router;
