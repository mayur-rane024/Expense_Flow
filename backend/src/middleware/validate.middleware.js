const { errorResponse } = require('../utils/response');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false, allowUnknown: false });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return errorResponse(res, message, 'VALIDATION_ERROR', 400);
    }
    req[property] = value;
    next();
  };
};

module.exports = { validate };
