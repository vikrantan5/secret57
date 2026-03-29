import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { getCoordinatesFromAddress, calculateDistance } from '../services/locationService';

export interface ServiceLocation {
  id: string;
  seller_id: string;
  address: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceLocationState {
  locations: ServiceLocation[];
  loading: boolean;
  error: string | null;
  
  // Fetch service locations by seller
  fetchSellerLocations: (sellerId: string) => Promise<void>;
  
  // Fetch service location by ID
  fetchLocationById: (id: string) => Promise<ServiceLocation | null>;
  
  // Add new service location
  addServiceLocation: (data: Partial<ServiceLocation>) => Promise<{ success: boolean; location?: ServiceLocation; error?: string }>;
  
  // Update service location
  updateServiceLocation: (id: string, data: Partial<ServiceLocation>) => Promise<{ success: boolean; error?: string }>;
  
  // Delete service location
  deleteServiceLocation: (id: string) => Promise<{ success: boolean; error?: string }>;
  
  // Set primary location
  setPrimaryLocation: (id: string, sellerId: string) => Promise<{ success: boolean; error?: string }>;
  
  // Get services within radius of user location
  getServicesNearby: (userLat: number, userLon: number, maxDistanceKm?: number) => Promise<any[]>;
  
  // Calculate distance to service location
  calculateDistanceToService: (serviceId: string, userLat: number, userLon: number) => Promise<number | null>;
}

export const useServiceLocationStore = create<ServiceLocationState>((set, get) => ({
  locations: [],
  loading: false,
  error: null,
  
  fetchSellerLocations: async (sellerId: string) => {
    try {
      set({ loading: true, error: null });
      
      const { data, error } = await supabase
        .from('service_locations')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ locations: data || [], loading: false });
    } catch (error: any) {
      console.error('Error fetching service locations:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  fetchLocationById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('service_locations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error: any) {
      console.error('Error fetching location:', error);
      return null;
    }
  },
  
  addServiceLocation: async (data) => {
    try {
      set({ loading: true, error: null });
      
      // Auto-fetch coordinates if not provided
      let { latitude, longitude } = data;
      
      if (!latitude || !longitude) {
        const fullAddress = `${data.address}, ${data.city}, ${data.pincode}`;
        const coords = await getCoordinatesFromAddress(fullAddress);
        
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        } else {
          return { success: false, error: 'Could not fetch coordinates for this address. Please enter manually.' };
        }
      }
      
      // Check if this is the first location for the seller
      const existingLocations = get().locations.filter(l => l.seller_id === data.seller_id);
      const isPrimary = existingLocations.length === 0;
      
      const locationData = {
        ...data,
        latitude,
        longitude,
        radius_km: data.radius_km || 10, // Default 10km radius
        is_primary: isPrimary,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { data: newLocation, error } = await supabase
        .from('service_locations')
        .insert([locationData])
        .select()
        .single();
      
      if (error) throw error;
      
      set({ 
        locations: [newLocation, ...get().locations],
        loading: false 
      });
      
      return { success: true, location: newLocation };
    } catch (error: any) {
      console.error('Error adding service location:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },
  
  updateServiceLocation: async (id, data) => {
    try {
      set({ loading: true, error: null });
      
      // Auto-fetch coordinates if address changed but coordinates not provided
      let updateData = { ...data };
      
      if ((data.address || data.city || data.pincode) && !data.latitude && !data.longitude) {
        const location = get().locations.find(l => l.id === id);
        if (location) {
          const fullAddress = `${data.address || location.address}, ${data.city || location.city}, ${data.pincode || location.pincode}`;
          const coords = await getCoordinatesFromAddress(fullAddress);
          
          if (coords) {
            updateData.latitude = coords.latitude;
            updateData.longitude = coords.longitude;
          }
        }
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('service_locations')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      set({
        locations: get().locations.map(l => l.id === id ? { ...l, ...updateData } : l),
        loading: false
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating service location:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },
  
  deleteServiceLocation: async (id) => {
    try {
      set({ loading: true, error: null });
      
      const location = get().locations.find(l => l.id === id);
      
      // Check if trying to delete primary location
      if (location?.is_primary) {
        const sellerLocations = get().locations.filter(l => l.seller_id === location.seller_id);
        if (sellerLocations.length > 1) {
          return { 
            success: false, 
            error: 'Cannot delete primary location. Please set another location as primary first.' 
          };
        }
      }
      
      const { error } = await supabase
        .from('service_locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set({
        locations: get().locations.filter(l => l.id !== id),
        loading: false
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting service location:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },
  
  setPrimaryLocation: async (id, sellerId) => {
    try {
      set({ loading: true, error: null });
      
      // Unset all primary locations for this seller
      await supabase
        .from('service_locations')
        .update({ is_primary: false })
        .eq('seller_id', sellerId);
      
      // Set new primary
      const { error } = await supabase
        .from('service_locations')
        .update({ 
          is_primary: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      set({
        locations: get().locations.map(l => ({
          ...l,
          is_primary: l.seller_id === sellerId ? l.id === id : l.is_primary
        })),
        loading: false
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error setting primary location:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },
  
  getServicesNearby: async (userLat: number, userLon: number, maxDistanceKm: number = 50) => {
    try {
      // Fetch all service locations with seller and service data
      const { data: locations, error } = await supabase
        .from('service_locations')
        .select(`
          *,
          seller:sellers(
            id,
            company_name,
            category_id
          )
        `);
      
      if (error) throw error;
      
      if (!locations) return [];
      
      // Filter locations within radius and calculate distance
      const nearbyLocations = locations
        .map(location => {
          const distance = calculateDistance(
            userLat,
            userLon,
            location.latitude,
            location.longitude
          );
          
          return {
            ...location,
            distance,
            isWithinRadius: distance <= location.radius_km
          };
        })
        .filter(location => location.distance <= maxDistanceKm)
        .sort((a, b) => a.distance - b.distance);
      
      // Fetch services for nearby sellers
      const sellerIds = nearbyLocations.map(l => l.seller_id);
      
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          seller:sellers(*),
          category:categories(*)
        `)
        .in('seller_id', sellerIds)
        .eq('is_active', true);
      
      if (servicesError) throw servicesError;
      
      // Attach distance to each service
      const servicesWithDistance = (services || []).map(service => {
        const location = nearbyLocations.find(l => l.seller_id === service.seller_id);
        return {
          ...service,
          distance: location?.distance || null,
          service_location: location || null
        };
      }).filter(s => s.distance !== null);
      
      return servicesWithDistance;
    } catch (error: any) {
      console.error('Error getting nearby services:', error);
      return [];
    }
  },
  
  calculateDistanceToService: async (serviceId: string, userLat: number, userLon: number) => {
    try {
      // Get service's seller_id
      const { data: service } = await supabase
        .from('services')
        .select('seller_id')
        .eq('id', serviceId)
        .single();
      
      if (!service) return null;
      
      // Get seller's primary location
      const { data: location } = await supabase
        .from('service_locations')
        .select('*')
        .eq('seller_id', service.seller_id)
        .eq('is_primary', true)
        .single();
      
      if (!location) return null;
      
      const distance = calculateDistance(
        userLat,
        userLon,
        location.latitude,
        location.longitude
      );
      
      return distance;
    } catch (error: any) {
      console.error('Error calculating distance:', error);
      return null;
    }
  }
}));
