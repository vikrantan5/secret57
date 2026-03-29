import { create } from 'zustand';
import { User, supabase } from '../services/supabase';
import { uploadImageToSupabase } from '../utils/imageUpload';

interface UserState {
  userData: User | null;
  loading: boolean;
  setUserData: (data: User | null) => void;
  updateUserData: (data: Partial<User>) => void;
  uploadAvatar: (userId: string, imageUri: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  updateUserProfile: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
}

export const useUserStore = create<UserState>((set, get) => ({
  userData: null,
  loading: false,
  
  setUserData: (data) => set({ userData: data }),
  
  updateUserData: (data) => set((state) => ({
    userData: state.userData ? { ...state.userData, ...data } : null,
  })),

  /**
   * Upload user avatar to Supabase Storage
   */
  uploadAvatar: async (userId: string, imageUri: string) => {
    try {
      set({ loading: true });
      
      // Upload to user-avatars bucket
      const result = await uploadImageToSupabase(
        imageUri,
        'user-avatars',
        userId,
        2 // 2MB max for avatars
      );

      if (!result.success || !result.url) {
        set({ loading: false });
        return {
          success: false,
          error: result.error || 'Failed to upload avatar'
        };
      }

      const avatarUrl = result.url;

      // Update user record in database with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) {
        set({ loading: false });
        return { success: false, error: updateError.message };
      }

      // Update local state
      const currentUser = get().userData;
      if (currentUser) {
        set({ userData: { ...currentUser, avatar_url: avatarUrl } as User });
      }

      set({ loading: false });
      return { success: true, url: avatarUrl };
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      set({ loading: false });
      return { success: false, error: error.message || 'Failed to upload avatar' };
    }
  },

  /**
   * Update user profile in database
   */
  updateUserProfile: async (userId: string, updates: Partial<User>) => {
    try {
      set({ loading: true });

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) {
        set({ loading: false });
        return { success: false, error: error.message };
      }

      // Update local state
      const currentUser = get().userData;
      if (currentUser) {
        set({ userData: { ...currentUser, ...updates } as User });
      }

      set({ loading: false });
      return { success: true };
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      set({ loading: false });
      return { success: false, error: error.message };
    }
  },
}));