class ErrorHandler extends Error {
  constructor(message, statusCode = 500, code = 'SERVER_ERROR', errors = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorHandler;
