export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const value = error as { code?: unknown; message?: unknown };
    if (typeof value.message === "string" && value.message.trim()) {
      return typeof value.code === "string" ? `${value.code}: ${value.message}` : value.message;
    }
  }
  return fallback;
}

export function isNotFoundError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) return error.code === "NOT_FOUND";
  const message = error instanceof Error ? error.message : error;
  return typeof message === "string" && /^NOT_FOUND(?::|\s|$)/.test(message);
}
