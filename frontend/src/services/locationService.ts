import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationAddress {
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

/**
 * Request location permissions from user
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Location permission is required to find nearby services and sellers.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get current device location
 */
export const getCurrentLocation = async (): Promise<LocationCoordinates | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    Alert.alert('Error', 'Failed to get your current location. Please try again.');
    return null;
  }
};

/**
 * Get address from coordinates (Reverse Geocoding)
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<LocationAddress | null> => {
  try {
    const [result] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (!result) return null;

    return {
      address: [result.street, result.streetNumber].filter(Boolean).join(' '),
      city: result.city || '',
      state: result.region || '',
      country: result.country || '',
      pincode: result.postalCode || '',
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
};

/**
 * Get coordinates from address (Forward Geocoding)
 */
export const getCoordinatesFromAddress = async (
  address: string
): Promise<LocationCoordinates | null> => {
  try {
    const results = await Location.geocodeAsync(address);
    
    if (results.length === 0) return null;

    return {
      latitude: results[0].latitude,
      longitude: results[0].longitude,
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula (in kilometers)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // Distance in kilometers
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Check if a location is within radius of another location
 */
export const isWithinRadius = (
  userLat: number,
  userLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(userLat, userLon, targetLat, targetLon);
  return distance <= radiusKm;
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Get user's current location with address
 */
export const getCurrentLocationWithAddress = async (): Promise<LocationAddress | null> => {
  try {
    const coordinates = await getCurrentLocation();
    if (!coordinates) return null;

    const address = await getAddressFromCoordinates(
      coordinates.latitude,
      coordinates.longitude
    );

    return address;
  } catch (error) {
    console.error('Error getting location with address:', error);
    return null;
  }
};
