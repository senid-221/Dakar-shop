const BASE = "/functions/v1/app";

export function getToken() {
  return localStorage.getItem("sm_token") || "";
}

export function setToken(token: string) {
  if (token) localStorage.setItem("sm_token", token);
  else localStorage.removeItem("sm_token");
}

export class ApiError extends Error {
  status: number;
  payload: Record<string, unknown>;
  constructor(status: number, payload: Record<string, unknown>) {
    super(typeof payload.error === "string" ? payload.error : "request_failed");
    this.status = status;
    this.payload = payload;
  }
}

export async function api<T = any>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  const token = getToken();
  if (token && options.auth !== false) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method: options.method || (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, { error: "invalid_response" });
  }
  if (!response.ok || !payload || payload.ok !== true) {
    if (response.status === 401) setToken("");
    throw new ApiError(response.status, payload || { error: "request_failed" });
  }
  return payload as T;
}

export const friendly: Record<string, string> = {
  login_required: "Please sign in to continue.",
  invalid_credentials: "Phone number or password is incorrect.",
  phone_taken: "An account already exists with this phone number.",
  weak_password: "Password must be at least 6 characters.",
  invalid_phone: "Enter a valid phone number.",
  empty_cart: "Your cart is empty.",
  insufficient_stock: "Not enough stock for one of the products in your cart.",
  coupon_invalid: "This coupon code is not valid.",
  coupon_expired: "This coupon has expired.",
  coupon_min_order: "This coupon needs a higher minimum order value.",
  coupon_exhausted: "This coupon has reached its usage limit.",
  cod_unavailable_zone: "Cash on Delivery is not available in your delivery area.",
  unknown_zone: "Select a delivery area to continue.",
  incomplete_address: "Complete the recipient name, phone and address.",
  incomplete_gift: "Complete the gift recipient name, phone and address.",
  bonus_insufficient: "Your bonus balance is lower than this amount.",
  bonus_cap: "You can use bonuses for up to half of the order value.",
  too_late_to_cancel: "This order is already being prepared and can no longer be cancelled online.",
  forbidden: "You do not have access to this area.",
  not_found: "We could not find what you were looking for.",
  service_error: "The service is temporarily unavailable. Please retry.",
  database_runtime_unavailable: "The service is temporarily unavailable. Please retry.",
};

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return friendly[error.message] || `Something went wrong (${error.message}).`;
  return "Network error. Check your connection and retry.";
}
