export class AppError extends Error {
  statusCode: number;
  errores?: string[];

  constructor(message: string, statusCode: number, errores?: string[]) {
    super(message);
    this.statusCode = statusCode;
    if (errores && errores.length > 0) {
      this.errores = errores;
    }
  }
}
