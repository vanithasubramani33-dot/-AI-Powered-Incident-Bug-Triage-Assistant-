function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ID: ${err.value}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate field value entered' });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Server error',
  });
}

module.exports = { notFound, errorHandler };
