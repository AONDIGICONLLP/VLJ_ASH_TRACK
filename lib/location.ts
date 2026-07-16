import * as Location from "expo-location";

export class LocationError extends Error {}

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export type ReverseGeocodeResult = {
  locationName: string;
  address: string;
};

export async function reverseGeocode(coords: Coordinates): Promise<ReverseGeocodeResult> {
  try {
    const [place] = await Location.reverseGeocodeAsync(coords);
    if (!place) return { locationName: "", address: "" };
    const locationName = place.name || place.street || "";
    const address = [place.street, place.city, place.region, place.postalCode, place.country]
      .filter(Boolean)
      .join(", ");
    return { locationName, address };
  } catch {
    return { locationName: "", address: "" };
  }
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationError("Turn on device location (GPS) and try again.");
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationError("Location permission denied. Enable it to record a trip end.");
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      12000
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    const lastKnown = await Location.getLastKnownPositionAsync({});
    if (lastKnown) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }
    throw new LocationError("Could not get your current location. Try again.");
  }
}
