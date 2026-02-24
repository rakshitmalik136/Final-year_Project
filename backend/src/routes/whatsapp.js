const express = require("express");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const {
  buildTwimlMessage,
  formatHelpMessage,
  formatOrderStatusMessage,
  normalizePhone
} = require("../services/whatsapp");

const router = express.Router();

const extractOrderId = (text) => {
  if (!text) return null;
  const match = String(text).match(/(\d{3,10})/);
  if (!match) return null;
  return Number(match[1]);
};

const buildReply = (message) => {
  return buildTwimlMessage(message);
};

router.post(
  "/inbound",
  asyncHandler(async (req, res) => {
    const incomingText = (req.body?.Body || "").trim();
    const from = req.body?.From || "";

    if (!incomingText) {
      res.type("text/xml");
      return res.send(buildReply(formatHelpMessage()));
    }

    const normalized = incomingText.toLowerCase();
    if (normalized === "help") {
      res.type("text/xml");
      return res.send(buildReply(formatHelpMessage()));
    }

    const orderId = extractOrderId(incomingText);
    if (!orderId) {
      res.type("text/xml");
      return res.send(buildReply(formatHelpMessage()));
    }

    const orderResult = await db.query(
      "SELECT id, status, customer_name, phone FROM orders WHERE id = $1",
      [orderId]
    );

    if (!orderResult.rows.length) {
      res.type("text/xml");
      return res.send(
        buildReply(
          `Sorry, we could not find order #${orderId}. Please check the number and try again.`
        )
      );
    }

    const order = orderResult.rows[0];
    const orderPhone = normalizePhone(order.phone);
    const inboundPhone = normalizePhone(from);

    if (orderPhone && inboundPhone && orderPhone !== inboundPhone) {
      res.type("text/xml");
      return res.send(
        buildReply(
          "Please send updates requests from the same WhatsApp number used while placing the order."
        )
      );
    }

    const reply = formatOrderStatusMessage({
      orderId: order.id,
      status: order.status,
      customerName: order.customer_name
    });

    res.type("text/xml");
    return res.send(buildReply(reply));
  })
);

module.exports = router;
