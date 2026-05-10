import type { Response } from "express";

// Evita repetir el JSON de error/éxito en cada controller
export const sendErrorResponse = (res: Response, statusCode: number, message: string, errors?: unknown) => {
  const response: { status: string; msg: string; errors?: unknown } = { status: "error", msg: message };
  if (errors !== undefined) response.errors = errors;
  res.status(statusCode).json(response);
};

export const sendSuccessResponse = (res: Response, statusCode: number, message: string, data?: unknown) => {
  const response: { status: string; msg: string; data?: unknown } = { status: "success", msg: message };
  if (data !== undefined) response.data = data;
  res.status(statusCode).json(response);
};
