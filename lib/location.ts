import * as Location from "expo-location";

export class LocationError extends Error {}

// Thrown when the device reports a mock/simulated position (Android's
// Location.isMock()/isFromMockProvider(), surfaced by expo-location as
// LocationObject.mocked). Callers should treat this as a hard rejection —
// never fall back to a cached/last-known fix instead, since a mock-location
// app being active means any recent fix on this device is untrustworthy.
export class MockLocationError extends LocationError {}

// Thrown when no fix better than MAX_ACCEPTABLE_ACCURACY_METERS could be
// obtained even after the refinement window below — same idea as gating on
// Location.getAccuracy() > 200 inside onLocationChanged on the native side,
// just implemented against expo-location's one-shot + watch APIs instead of
// a raw LocationListener.
export class LowAccuracyError extends LocationError {}

// Android's Location.getAccuracy() is a radius in meters — lower is better.
// A single getCurrentPositionAsync call can return a rough, e.g.
// network-based, fix before GPS has locked on; treat anything worse than
// this as unacceptable rather than silently accepting it.
const MAX_ACCEPTABLE_ACCURACY_METERS = 200;
// How long to keep listening for a better fix (via watchPositionAsync, the
// same continuous-update mechanism as onLocationChanged) before settling
// for whatever the best reading was.
const ACCURACY_REFINE_WINDOW_MS = 8000;

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  bearing?: number | null;
  timestamp?: number;
  mocked?: boolean;
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

// Keeps listening for fresh fixes (watchPositionAsync — the same continuous
// callback mechanism as Android's onLocationChanged) and remembers whichever
// one has the best accuracy, stopping early as soon as one clears the
// acceptable threshold, or after the refine window elapses, whichever comes
// first. Mock readings are never allowed to become "best" — the outer
// mocked check in getCurrentCoordinates still applies to whatever this
// returns.
async function refineAccuracy(initial: Location.LocationObject): Promise<Location.LocationObject> {
  let best = initial;
  let subscription: Location.LocationSubscription | undefined;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      subscription?.remove();
      resolve();
    };
    const timer = setTimeout(finish, ACCURACY_REFINE_WINDOW_MS);

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      (update) => {
        if (update.mocked) return;
        if (update.coords.accuracy != null && (best.coords.accuracy == null || update.coords.accuracy < best.coords.accuracy)) {
          best = update;
        }
        if (best.coords.accuracy != null && best.coords.accuracy <= MAX_ACCEPTABLE_ACCURACY_METERS) {
          clearTimeout(timer);
          finish();
        }
      }
    )
      .then((sub) => {
        subscription = sub;
        if (settled) sub.remove();
      })
      .catch(finish);
  });

  return best;
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
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationError("Location permission denied. Enable it to record a trip end.");
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    try {
      // Android: shows the native "turn on location" resolution dialog and
      // enables it directly if the user agrees — no manual trip to Settings.
      // No-op on iOS (Apple doesn't allow enabling Location Services
      // programmatically there), so this still falls through to the error
      // below on that platform.
      await Location.enableNetworkProviderAsync();
    } catch {
      throw new LocationError("Turn on device location (GPS) and try again.");
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new LocationError("Turn on device location (GPS) and try again.");
    }
  }

  let position: Location.LocationObject;
  try {
    // Highest accuracy setting expo-location exposes (GPS + sensor fusion) —
    // takes longer to get a fix than Balanced, so the timeout is generous.
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }),
      20000
    );
  } catch {
    const lastKnown = await Location.getLastKnownPositionAsync({});
    if (!lastKnown) {
      throw new LocationError("Could not get your current location. Try again.");
    }
    position = lastKnown;
  }

  // Checked on whichever position we ended up with (live fix or last-known
  // fallback) — reject outright rather than silently accepting a simulated
  // location from a Fake GPS app.
  if (position.mocked) {
    throw new MockLocationError(
      "This device is reporting a simulated (mock/fake GPS) location. Disable any mock location app and try again."
    );
  }

  // A single fix can come back with a very rough (e.g. network-based)
  // accuracy before GPS locks on — give it a short window to improve
  // instead of accepting the first reading unconditionally.
  if (position.coords.accuracy == null || position.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    position = await refineAccuracy(position);
  }

  if (position.mocked) {
    throw new MockLocationError(
      "This device is reporting a simulated (mock/fake GPS) location. Disable any mock location app and try again."
    );
  }

  if (position.coords.accuracy == null || position.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    const accuracyLabel =
      position.coords.accuracy != null ? `±${Math.round(position.coords.accuracy)} m` : "unknown";
    throw new LowAccuracyError(
      `Location accuracy is too low (${accuracyLabel}). Move to an open area, away from buildings, and try again.`
    );
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed,
    bearing: position.coords.heading,
    timestamp: position.timestamp,
    mocked: position.mocked ?? false,
  };
}
