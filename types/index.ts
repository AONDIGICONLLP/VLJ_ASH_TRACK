export type Role = "superadmin" | "admin" | "user";

export type AppUser = {
  id: string;
  username: string;
  email: string;
  employeeId: string;
  password: string;
  mobileNo: string;
  address: string;
  role: Role;
  createdAt: number;
};

export type Permission = {
  name: string;
  shortCode: string;
  canView: number;
  canAdd: number;
};

export type Session = {
  username: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  roleID: number;
  permissions: Permission[];
  token: string;
  role: Role;
};

export type Vehicle = {
  id: string;
  vehicleNo: string;
  rfidTags: string[];
  remarks?: string;
  createdAt: number;
};

export type DeviceRecord = {
  id: string;
  deviceName: string;
  deviceId: string;
  zoneId: string;
  zoneName?: string;
  zoneType?: "Circle" | "Polygon";
  latitude?: string;
  longitude?: string;
  radius?: string;
  coordinates?: string;
  createdAt: number;
};

export type TripType = "start" | "end";
export type TripMethod = "rfid" | "vehicle";

export type TripRecord = {
  id: string;
  type: TripType;
  method: TripMethod;
  rfidTag: string;
  vehicleNo: string;
  deviceRecordId: string;
  deviceName: string;
  place: string;
  latitude: string;
  longitude: string;
  radius: string;
  deviceId: string;
  imageUri?: string;
  createdAt: number;
};
