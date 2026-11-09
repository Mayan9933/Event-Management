import { DomainError } from '../domain/errors/DomainError.js';

/** Central exception handling: every failure becomes a consistent JSON response. */
export default function errorHandler(err, req, res, next) {
  const isDomain = err instanceof DomainError;
  const status = isDomain ? err.statusCode
    : err.name === 'ValidationError' || err.name === 'CastError' ? 400
    : err.status || 500;

  if (status >= 500) console.error(err);   // expected business errors are not logged as crashes
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
    ...(isDomain ? { code: err.code } : {})
  });
}
