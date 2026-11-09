/**
 * Exception hierarchy (inheritance + polymorphism).
 * Every business-rule failure is a DomainError carrying an HTTP-style status and a machine code,
 * so the Express error middleware can handle all of them uniformly.
 */
export class DomainError extends Error {
  constructor(message, statusCode = 400, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message, code = 'VALIDATION_ERROR') { super(message, 400, code); }
}
export class AuthenticationError extends DomainError {
  constructor(message, code = 'UNAUTHENTICATED') { super(message, 401, code); }
}
export class ForbiddenError extends DomainError {
  constructor(message, code = 'FORBIDDEN') { super(message, 403, code); }
}
export class NotFoundError extends DomainError {
  constructor(message, code = 'NOT_FOUND') { super(message, 404, code); }
}
export class ConflictError extends DomainError {
  constructor(message, code = 'CONFLICT') { super(message, 409, code); }
}
