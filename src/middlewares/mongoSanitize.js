const clean = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      clean(obj[key]);
    }
  }
  return obj;
};

/**
 * Express 5 compatible NoSQL Injection sanitization middleware.
 * Mutates objects in place to respect getter-only properties like req.query in Express 5.
 */
export const sanitizeNoSQL = (req, res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  if (req.query) clean(req.query);
  next();
};
