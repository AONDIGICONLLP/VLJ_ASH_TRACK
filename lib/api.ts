import { getDeviceId } from "@/lib/device";
import { getToken } from "@/lib/token-service";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export class ApiError extends Error {}

type ApiEnvelope = {
  status: boolean;
  message?: string;
};

async function apiRequest<TResponse extends ApiEnvelope>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData },
  fallbackMessage: string
): Promise<TResponse> {
  const token = getToken();
  const headers: Record<string, string> = {};
  // Never set Content-Type for FormData bodies — fetch/RN need to generate
  // the multipart boundary themselves.
  if (!init.form) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = `${API_BASE_URL}${path}`;
  const method = init.method ?? "GET";
  // Debug aid: confirms the exact Authorization header value sent on the
  // wire — check Metro/device logs if a call is unexpectedly unauthenticated.
  console.log(`[api] ${method} ${url} Authorization=${headers.Authorization ?? "(none)"}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    throw new ApiError("Could not reach the server. Check your internet connection.");
  }
  clearTimeout(timeoutId);

  let data: TResponse;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(fallbackMessage);
  }

  if (!response.ok || !data.status) {
    throw new ApiError(data.message || fallbackMessage);
  }

  return data;
}

export type LoginPermission = {
  name: string;
  shortCode: string;
  canView: number;
  canAdd: number;
};

export type LoginResponse = ApiEnvelope & {
  data: {
    username: string;
    roleID: number;
    name: string;
    email: string;
    phone: string;
    company: string;
    token: string;
    permissions: LoginPermission[];
  };
};

export async function loginApi(username: string, password: string) {
  const deviceID = await getDeviceId();
  const result = await apiRequest<LoginResponse>(
    "api/v1/user/login/",
    { method: "POST", body: { username, password, deviceID } },
    "Login failed."
  );
  return result.data;
}

export type RegisterResponse = ApiEnvelope;

export type RegisterUserParams = {
  roleID: string;
  username: string;
  name: string;
  company: string;
  password: string;
  email?: string;
  phone?: string;
  isActive?: number;
};

export async function registerApi(params: RegisterUserParams): Promise<string> {
  const result = await apiRequest<RegisterResponse>(
    "api/v1/user/register/",
    { method: "POST", body: params },
    "Registration failed."
  );
  return result.message ?? "";
}

export type RolesResponse = ApiEnvelope & {
  data: { role: string }[];
};

// Returns the active role names for the authenticated account — the
// register form's Role ID field must be one of these.
export async function getRolesApi(): Promise<string[]> {
  const result = await apiRequest<RolesResponse>("api/v1/roles/", {}, "Could not load roles.");
  return result.data.map((r) => r.role).filter(Boolean);
}

export type MapRfidResponse = ApiEnvelope;

export async function mapRfidApi(vehicleNo: string, rfid: string) {
  const result = await apiRequest<MapRfidResponse>(
    "api/v1/rfid/",
    { method: "POST", body: { deviceID: vehicleNo, rfid } },
    "RFID mapping failed."
  );
  return result.message ?? "";
}

// The deployed endpoint currently returns { deviceID } items instead of the
// documented { vehiclenumber } shape — accept either so the app keeps working
// whichever one is actually live.
type RawVehicle = { vehiclenumber?: string; deviceID?: string };

export type VehiclesResponse = ApiEnvelope & {
  data: RawVehicle[];
};

export async function getVehiclesApi(): Promise<string[]> {
  const result = await apiRequest<VehiclesResponse>("api/v1/vehicles/", {}, "Could not load vehicles.");
  return result.data
    .map((v) => (v.vehiclenumber ?? v.deviceID ?? "").toUpperCase())
    .filter(Boolean);
}

export type ZoneType = "Circle" | "Polygon";

// Only zoneId is guaranteed — everything else is shown only if the API
// actually provides it. No placeholder text ("Unnamed zone", "Circle" as a
// default, etc.) is invented for missing fields; the UI renders those as
// blank instead.
export type Zone = {
  zoneId: string;
  zoneName?: string;
  zoneType?: ZoneType;
  radius?: number | null;
  latLong?: string;
};

// The deployed endpoint's field casing has been inconsistent (zoneId vs
// zoneID) — accept either.
type RawZone = {
  zoneId?: string;
  zoneID?: string;
  zoneName?: string | null;
  zoneType?: ZoneType;
  radius?: number | null;
  latLong?: string;
};

export type ZonesResponse = ApiEnvelope & {
  data: RawZone[];
};

export async function getZonesApi(): Promise<Zone[]> {
  const result = await apiRequest<ZonesResponse>("api/v1/zones/", {}, "Could not load zones.");
  return result.data.map((z) => ({
    zoneId: z.zoneId ?? z.zoneID ?? "",
    zoneName: z.zoneName || undefined,
    zoneType: z.zoneType || undefined,
    radius: z.radius ?? undefined,
    latLong: z.latLong || undefined,
  }));
}

export function parseZoneCoordinates(
  latLong: string | undefined
): { latitude: string; longitude: string }[] {
  if (!latLong) return [];
  return latLong
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [latitude, longitude] = pair.split(",").map((v) => v.trim());
      return { latitude, longitude };
    });
}

export type ReaderResponse = ApiEnvelope;

// Trip end is its own endpoint (api/v1/trip/), separate from the reader
// registration endpoint below (api/v1/reader/). Multipart because of the
// optional vehicle photo — no Content-Type header is set for it, so
// fetch/RN generate the correct boundary themselves.
export async function submitTripEndApi(params: {
  deviceID: string;
  rfid: string;
  readerID: string;
  latitude: number;
  longitude: number;
  endTimestamp: number;
  imageUri?: string;
}): Promise<string> {
  const form = new FormData();
  form.append("deviceID", params.deviceID);
  form.append("rfid", params.rfid);
  form.append("readerID", params.readerID);
  form.append("latitude", String(params.latitude));
  form.append("longitude", String(params.longitude));
  form.append("endTimestamp", String(params.endTimestamp));

  if (params.imageUri) {
    const filename = params.imageUri.split("/").pop() || "trip-end.jpg";
    const extension = filename.split(".").pop()?.toLowerCase();
    const type = extension === "png" ? "image/png" : "image/jpeg";
    form.append(
      "image",
      { uri: params.imageUri, name: filename, type } as unknown as Blob
    );
  }

  const result = await apiRequest<ReaderResponse>(
    "api/v1/trip/",
    { method: "POST", form },
    "Trip end submission failed."
  );
  return result.message ?? "";
}

// Registers this handheld reader against a zone — readerID (this device's own
// hardware ID) and zoneID (the selected zone).
export async function registerDeviceApi(readerID: string, zoneID: string): Promise<string> {
  const result = await apiRequest<ReaderResponse>(
    "api/v1/reader/",
    { method: "POST", body: { readerID: readerID.trim(), zoneID: zoneID.trim() } },
    "Device registration failed."
  );
  return result.message ?? "";
}
