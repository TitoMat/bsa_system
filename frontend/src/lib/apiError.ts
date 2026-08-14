export function getApiErrorMessage(error: unknown, fallback: string): string {
  const responseData = (error as { response?: { data?: unknown }; message?: string })
    .response?.data;
  if (responseData && typeof responseData === 'object') {
    const message = (responseData as Record<string, unknown>).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.trim()) return message;
  }
  const message = (error as { message?: string }).message;
  return message?.trim() || fallback;
}
