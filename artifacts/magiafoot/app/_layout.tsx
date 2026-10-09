import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CareerProvider, useCareer } from '@/context/CareerContext';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isReady, cloudEmail, activeCareerSlot, authRestoring } = useCareer();

  useEffect(() => {
    if (!isReady || authRestoring) return;
    const firstSegment = segments[0];
    const isAccountEntry = firstSegment === 'account-save';
    const isSlotEntry = firstSegment === 'career-slots';
    const isNewCareer = firstSegment === 'new-career';

    if (!cloudEmail) {
      if (!isAccountEntry) router.replace('/account-save');
      return;
    }

    if (!activeCareerSlot && !isSlotEntry && !isAccountEntry && !isNewCareer) {
      router.replace('/career-slots');
    }
  }, [isReady, authRestoring, cloudEmail, activeCareerSlot, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Voltar' }} />
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <CareerProvider>
                <RootLayoutNav />
              </CareerProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
