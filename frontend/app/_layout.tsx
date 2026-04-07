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
         <Stack.Screen name="seller/dashboard" />
        <Stack.Screen name="seller/pending-approval" />
        <Stack.Screen name="seller/company-setup" />
        <Stack.Screen name="seller/products" />
        <Stack.Screen name="seller/orders" />
        <Stack.Screen name="seller/bookings" />
        <Stack.Screen name="seller/revenue" />
        <Stack.Screen name="seller/add-product" />
        <Stack.Screen name="seller/add-service" />
                <Stack.Screen name="notifications/index" />
         <Stack.Screen name="admin/dashboard" />
        <Stack.Screen name="admin/pending-sellers" />
      </Stack>
    </>
  );
}
