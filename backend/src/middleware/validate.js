const { ZodError } = require("zod");

const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

const zodErrorFormatter = (error) => {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          message: "Validation error",
          details: error.errors.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        }
      }
    };
  }
  return null;
};

module.exports = { validate, zodErrorFormatter };
