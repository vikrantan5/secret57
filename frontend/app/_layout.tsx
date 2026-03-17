import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';

// Keep the splash screen visible while we check auth state
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { checkSession, loading } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/role-selection" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
