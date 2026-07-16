import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AppUser,
  DeviceRecord,
  Session,
  TripRecord,
  TripType,
  Vehicle,
} from "@/types";

const KEYS = {
  session: "@ash_track/session",
  users: "@ash_track/users",
  vehicles: "@ash_track/vehicles",
  devices: "@ash_track/devices",
  trips: "@ash_track/trips",
} as const;

function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function readList<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

async function writeList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ---------- Session ----------

export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(KEYS.session);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function setSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.session);
}

// ---------- Users / auth ----------
//
// Authentication happens entirely against the real backend (see lib/api.ts) —
// login no longer resolves or bootstraps a local profile/role. This list is
// only read for the local "Team" count shown in More.

export async function getUsers(): Promise<AppUser[]> {
  return readList<AppUser>(KEYS.users);
}

// ---------- Vehicles / RFID tags ----------

export async function getVehicles(): Promise<Vehicle[]> {
  const vehicles = await readList<Vehicle>(KEYS.vehicles);
  return vehicles.map((v) => ({ ...v, rfidTags: v.rfidTags ?? [] }));
}

export async function findVehicleByTag(
  tag: string
): Promise<Vehicle | undefined> {
  const vehicles = await getVehicles();
  const normalized = tag.trim().toUpperCase();
  return vehicles.find((v) => v.rfidTags.includes(normalized));
}

export async function findVehicleByNo(
  vehicleNo: string
): Promise<Vehicle | undefined> {
  const vehicles = await getVehicles();
  return vehicles.find(
    (v) => v.vehicleNo.toUpperCase() === vehicleNo.trim().toUpperCase()
  );
}

export async function upsertVehicleTags(
  vehicleNo: string,
  tags: string[],
  remarks?: string
): Promise<{ vehicle: Vehicle; duplicates: string[] }> {
  const vehicles = await getVehicles();
  const normalizedNo = vehicleNo.trim().toUpperCase();
  const normalizedTags = tags.map((t) => t.trim().toUpperCase()).filter(Boolean);

  const ownerOfTag = new Map<string, string>();
  vehicles.forEach((v) => v.rfidTags.forEach((t) => ownerOfTag.set(t, v.vehicleNo)));

  const duplicates = normalizedTags.filter(
    (t) => ownerOfTag.has(t) && ownerOfTag.get(t) !== normalizedNo
  );
  const usableTags = normalizedTags.filter((t) => !duplicates.includes(t));

  const existingIndex = vehicles.findIndex((v) => v.vehicleNo === normalizedNo);

  if (existingIndex !== -1) {
    const existing = vehicles[existingIndex];
    const mergedTags = Array.from(new Set([...existing.rfidTags, ...usableTags]));
    const updated: Vehicle = {
      ...existing,
      rfidTags: mergedTags,
      remarks: remarks || existing.remarks,
    };
    vehicles[existingIndex] = updated;
    await writeList(KEYS.vehicles, vehicles);
    return { vehicle: updated, duplicates };
  }

  const created: Vehicle = {
    id: generateId(),
    vehicleNo: normalizedNo,
    rfidTags: usableTags,
    remarks,
    createdAt: Date.now(),
  };
  await writeList(KEYS.vehicles, [created, ...vehicles]);
  return { vehicle: created, duplicates };
}

export async function removeVehicleTag(
  vehicleNo: string,
  tag: string
): Promise<void> {
  const vehicles = await getVehicles();
  const updated = vehicles
    .map((v) =>
      v.vehicleNo === vehicleNo
        ? { ...v, rfidTags: v.rfidTags.filter((t) => t !== tag) }
        : v
    )
    .filter((v) => v.rfidTags.length > 0);
  await writeList(KEYS.vehicles, updated);
}

// ---------- Devices ----------

export async function getDevices(): Promise<DeviceRecord[]> {
  return readList<DeviceRecord>(KEYS.devices);
}

export async function findDeviceByHardwareId(
  deviceId: string
): Promise<DeviceRecord | undefined> {
  const devices = await getDevices();
  return devices.find((d) => d.deviceId === deviceId);
}

export async function addDevice(
  device: Omit<DeviceRecord, "id" | "createdAt">
): Promise<DeviceRecord> {
  const devices = await readList<DeviceRecord>(KEYS.devices);
  const created: DeviceRecord = {
    ...device,
    id: generateId(),
    createdAt: Date.now(),
  };
  await writeList(KEYS.devices, [created, ...devices]);
  return created;
}

export async function deleteDevice(id: string): Promise<void> {
  const devices = await readList<DeviceRecord>(KEYS.devices);
  await writeList(KEYS.devices, devices.filter((d) => d.id !== id));
}

// ---------- Trips ----------

export async function getTrips(type?: TripType): Promise<TripRecord[]> {
  const trips = await readList<TripRecord>(KEYS.trips);
  return type ? trips.filter((t) => t.type === type) : trips;
}

export async function addTrip(
  trip: Omit<TripRecord, "id" | "createdAt">
): Promise<TripRecord> {
  const trips = await readList<TripRecord>(KEYS.trips);
  const created: TripRecord = { ...trip, id: generateId(), createdAt: Date.now() };
  await writeList(KEYS.trips, [created, ...trips]);
  return created;
}
