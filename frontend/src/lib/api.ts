export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export class ApiError extends Error {
  constructor(public status: number, message: string, public failures: string[] = []) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  let response: Response;
  try { response = await fetch(API + path, { ...options, credentials: 'include', headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...options.headers } }); }
  catch { throw new ApiError(0, 'Unable to reach the server. Make sure the backend is running.'); }
  const data = await response.json();
  if (!response.ok) throw new ApiError(response.status, data.message || 'Request failed.', data.failures);
  return data;
}
