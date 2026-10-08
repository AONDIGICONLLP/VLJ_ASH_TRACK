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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

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

const CACHE_TTL_MS = 60_000;

// Wraps a fetcher with a short-lived cache and in-flight de-duplication —
// used for stable reference lists (vehicles, zones) that multiple screens
// request independently. A failed fetch is never cached, so the next call
// simply retries against the network.
function createCachedFetcher<T>(fetcher: () => Promise<T>) {
  let cache: { data: T; expiresAt: number } | null = null;
  let inFlight: Promise<T> | null = null;

  return function cachedFetch(): Promise<T> {
    if (cache && Date.now() < cache.expiresAt) {
      return Promise.resolve(cache.data);
    }
    if (!inFlight) {
      inFlight = fetcher()
        .then((data) => {
          cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
          return data;
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
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
    "user/login/",
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
    "user/register/",
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
  const result = await apiRequest<RolesResponse>("roles/", {}, "Could not load roles.");
  return result.data.map((r) => r.role).filter(Boolean);
}

export type HistoryUser = {
  id: number;
  roleID: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  isActive: number;
  createdAt: string;
  updatedAt: string | null;
};

export type HistoryRfid = {
  id: number;
  deviceID: string;
  rfid: string;
  isActive: number;
  createdAt: string;
  updatedAt: string | null;
};

export type HistoryReader = {
  id: number;
  readerID: string;
  zoneID: string;
  isActive: number;
  createdAt: string;
  updatedAt: string | null;
};

// The trip-record shape isn't documented yet (the live endpoint has only
// ever returned an empty array) — kept loose rather than guessing fields.
export type HistoryTrip = Record<string, unknown>;

export type UserHistory = {
  users: HistoryUser[];
  trips: HistoryTrip[];
  rfid: HistoryRfid[];
  readers: HistoryReader[];
};

export type UserHistoryResponse = ApiEnvelope & {
  data: UserHistory;
};

export async function getUserHistoryApi(): Promise<UserHistory> {
  const result = await apiRequest<UserHistoryResponse>(
    "user/history/",
    {},
    "Could not load history."
  );
  return {
    users: result.data.users ?? [],
    trips: result.data.trips ?? [],
    rfid: result.data.rfid ?? [],
    readers: result.data.readers ?? [],
  };
}

export type MultipleRfidResponse = ApiEnvelope & {
  data: {
    deviceID: string;
    inserted: string[];
    ignored: string[];
    failed: string[];
  };
};

// Maps one or more RFID tags to a single vehicle/device in one call —
// mappings that already exist are ignored server-side rather than erroring.
export async function mapMultipleRfidApi(
  deviceID: string,
  rfid: string[]
): Promise<MultipleRfidResponse["data"]> {
  const result = await apiRequest<MultipleRfidResponse>(
    "multiplerfid/",
    { method: "POST", body: { deviceID, rfid } },
    "RFID mapping failed."
  );
  return result.data;
}

type RfidVehicleMatch = { rfid: string; deviceID: string };

export type MultipleRfidVehiclesResponse = ApiEnvelope & {
  // The live endpoint returns a bare object (not an array) when there's only
  // one match, despite the documented shape always being an array.
  data: RfidVehicleMatch | RfidVehicleMatch[];
};

// Resolves the vehicle (deviceID) mapped to each of the given RFID tags in
// one call — used by the trip-end screen's "Via RFID" method. A tag with no
// mapping is simply absent from the returned map.
export async function getVehiclesByRfidApi(rfid: string[]): Promise<Record<string, string>> {
  const result = await apiRequest<MultipleRfidVehiclesResponse>(
    "multiplerfidVehicles/",
    { method: "POST", body: { rfid } },
    "Could not find vehicles for these RFID tags."
  );
  const items = Array.isArray(result.data) ? result.data : [result.data];
  const map: Record<string, string> = {};
  items.forEach((item) => {
    if (item?.rfid && item?.deviceID) map[item.rfid] = item.deviceID;
  });
  return map;
}

export type ImageFlagResponse = ApiEnvelope & {
  data: { rfid: string; imageRequired: string | number; mapped: number };
};

export async function getImageRequiredApi(rfid: string): Promise<boolean> {
  const result = await apiRequest<ImageFlagResponse>(
    "getImageFlag/",
    { method: "POST", body: { rfid } },
    "Could not check image requirement for this RFID."
  );
  return String(result.data.imageRequired) === "0";
}

// The deployed endpoint currently returns { deviceID } items instead of the
// documented { vehiclenumber } shape — accept either so the app keeps working
// whichever one is actually live.
type RawVehicle = { vehiclenumber?: string; deviceID?: string };

export type VehiclesResponse = ApiEnvelope & {
  data: RawVehicle[];
};

async function fetchVehicles(): Promise<string[]> {
  const result = await apiRequest<VehiclesResponse>("vehicles/", {}, "Could not load vehicles.");
  return result.data
    .map((v) => (v.vehiclenumber ?? v.deviceID ?? "").toUpperCase())
    .filter(Boolean);
}

export const getVehiclesApi = createCachedFetcher(fetchVehicles);

export type VehicleTag = {
  rfid: string;
  isActive: number;
};

export type VehicleTagsResponse = ApiEnvelope & {
  data: VehicleTag[];
};

// Looks up the RFID tags mapped to a given vehicle (deviceID) — used to
// populate the tag picker once a vehicle is selected on the trip-end screen.
export async function getVehicleTagsApi(deviceID: string): Promise<VehicleTag[]> {
  const result = await apiRequest<VehicleTagsResponse>(
    "vehicleTags/",
    { method: "POST", body: { deviceID } },
    "Could not load RFID tags."
  );
  return result.data;
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

async function fetchZones(): Promise<Zone[]> {
  const result = await apiRequest<ZonesResponse>("zones/", {}, "Could not load zones.");
  return result.data.map((z) => ({
    zoneId: z.zoneId ?? z.zoneID ?? "",
    zoneName: z.zoneName || undefined,
    zoneType: z.zoneType || undefined,
    radius: z.radius ?? undefined,
    latLong: z.latLong || undefined,
  }));
}

// Same rationale as getVehiclesApi above — device registration and More both
// load the full zone list independently.
export const getZonesApi = createCachedFetcher(fetchZones);

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

const MAX_TRIP_IMAGE_BYTES = 2 * 1024 * 1024;

// Trip end is its own endpoint (trip/), separate from the reader
// registration endpoint below (reader/). Multipart because of the
// optional vehicle photo — no Content-Type header is set for it, so
// fetch/RN generate the correct boundary themselves.
//
// deviceID/rfid are both optional per the API (the server can derive one
// from the other), but the caller should always send at least one — the
// trip-end screen resolves this by requiring a vehicle + tag selection
// before it ever calls this function.
export async function submitTripEndApi(params: {
  readerID: string;
  endTimestamp: string;
  latitude: string;
  longitude: string;
  rfid?: string;
  deviceID?: string;
  imageUri?: string;
}): Promise<string> {
  const form = new FormData();
  form.append("readerID", params.readerID);
  form.append("endTimestamp", params.endTimestamp);
  form.append("latitude", params.latitude);
  form.append("longitude", params.longitude);
  if (params.rfid) form.append("rfid", params.rfid);
  if (params.deviceID) form.append("deviceID", params.deviceID);

  if (params.imageUri) {
    const filename = params.imageUri.split("/").pop() || "trip-end.jpg";
    const extension = filename.split(".").pop()?.toLowerCase();
    const type =
      extension === "png" ? "image/png" : extension === "jpg" || extension === "jpeg" ? "image/jpeg" : null;
    if (!type) {
      throw new ApiError("Only JPG, JPEG and PNG images are allowed.");
    }

    const fileResponse = await fetch(params.imageUri);
    const blob = await fileResponse.blob();
    if (blob.size > MAX_TRIP_IMAGE_BYTES) {
      throw new ApiError("Maximum allowed image size is 2 MB.");
    }

    form.append("image", { uri: params.imageUri, name: filename, type } as unknown as Blob);
  }

  const result = await apiRequest<ReaderResponse>(
    "trip/",
    { method: "POST", form },
    "Trip end submission failed."
  );
  return result.message ?? "";
}

// Registers this handheld reader against a zone — readerID (this device's own
// hardware ID) and zoneID (the selected zone). imageRequired is inverted per
// the API's own contract: 0 means an image IS required, 1 means it is NOT.
export async function registerDeviceApi(
  readerID: string,
  zoneID: string,
  imageRequired: 0 | 1
): Promise<string> {
  const result = await apiRequest<ReaderResponse>(
    "reader/",
    {
      method: "POST",
      body: { readerID: readerID.trim(), zoneID: zoneID.trim(), imageRequired },
    },
    "Device registration failed."
  );
  return result.message ?? "";
}
