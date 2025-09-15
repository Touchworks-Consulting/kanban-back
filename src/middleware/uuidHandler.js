/**
 * Middleware para transformar strings vazias em null para campos UUID
 * Evita erro "invalid input syntax for type uuid: ''"
 */
const handleUuidFields = (uuidFields = []) => {
  return (req, res, next) => {
    if (req.body) {
      uuidFields.forEach(field => {
        if (req.body.hasOwnProperty(field) && req.body[field] === '') {
          req.body[field] = null;
        }
      });
    }
    next();
  };
};

module.exports = {
  handleUuidFields
};