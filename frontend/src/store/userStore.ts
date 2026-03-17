import { create } from 'zustand';
import { User } from '../services/supabase';

interface UserState {
  userData: User | null;
  setUserData: (data: User | null) => void;
  updateUserData: (data: Partial<User>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userData: null,
  
  setUserData: (data) => set({ userData: data }),
  
  updateUserData: (data) => set((state) => ({
    userData: state.userData ? { ...state.userData, ...data } : null,
  })),
}));
