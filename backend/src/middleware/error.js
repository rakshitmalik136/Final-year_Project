const { zodErrorFormatter } = require("./validate");

const notFound = (req, res) => {
  res.status(404).json({
    error: {
      message: "Route not found"
    }
  });
};

const errorHandler = (err, req, res, next) => {
  const zodResult = zodErrorFormatter(err);
  if (zodResult) {
    return res.status(zodResult.status).json(zodResult.body);
  }

  const status = err.status || 500;
  const message = err.message || "Unexpected server error";

  return res.status(status).json({
    error: {
      message
    }
  });
};

module.exports = { notFound, errorHandler };
