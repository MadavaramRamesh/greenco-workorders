import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/domain/theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.brand,
          headerTitleStyle: { color: theme.text },
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

