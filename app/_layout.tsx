import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/domain/theme';
import { openAppDatabase } from '../src/data/db';
import { seedDatabaseIfEmpty } from '../src/seed/seed';

export default function RootLayout() {
  const theme = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const db = await openAppDatabase();
        await seedDatabaseIfEmpty(db);
        if (isMounted) {
          setIsReady(true);
        }
      } catch (err: any) {
        console.error('[RootLayout] DB initialization error:', err);
        if (isMounted) {
          setInitError(err?.message ?? 'Failed to initialize database');
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {initError ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorTitle, { color: theme.error }]}>
              Initialization Failed
            </Text>
            <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
              {initError}
            </Text>
          </View>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.brand} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading GreenCo Work Orders...
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.brand,
          headerTitleStyle: { color: theme.text },
          headerLargeTitleStyle: { color: theme.text },
          contentStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Work Orders',
            headerLargeTitle: true,
          }}
        />
        <Stack.Screen
          name="order/[id]"
          options={{
            title: 'Work Order Detail',
            headerBackTitle: 'Orders',
          }}
        />
        <Stack.Screen
          name="order/edit"
          options={{
            title: 'Work Order',
            headerBackTitle: 'Cancel',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  errorBox: {
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
});
