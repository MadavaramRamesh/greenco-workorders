import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useOffline } from '../hooks/useOffline';
import { useTheme } from '../domain/theme';

export interface OfflineCapsuleProps {
  style?: object;
}

/**
 * Compact toggle capsule in the navigation bar.
 * - Offline: amber capsule with switch indicator on (knob on right).
 * - Online: green capsule with switch indicator off (knob on left).
 * - Minimum touch target 44px.
 * - Tapping flips mode and persists to SQLite.
 */
export function OfflineCapsule({ style }: OfflineCapsuleProps) {
  const theme = useTheme();
  const { isOffline, toggleOffline } = useOffline();

  const colors = isOffline ? theme.offline : theme.online;
  const label = isOffline ? 'Offline' : 'Online';

  return (
    <Pressable
      onPress={toggleOffline}
      accessibilityRole="switch"
      accessibilityLabel={`Toggle offline mode, currently ${label}`}
      accessibilityState={{ checked: isOffline }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.capsule,
        {
          backgroundColor: colors.background,
          borderColor: colors.fill,
        },
        style,
      ]}
    >
      <Text style={[styles.statusGlyph, { color: colors.text }]}>
        {isOffline ? '⊘' : '●'}
      </Text>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
      </Text>

      {/* Mini switch track & thumb */}
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: isOffline ? colors.fill : (theme.isDark ? '#38383A' : '#D1D1D6'),
            justifyContent: isOffline ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        <View style={styles.switchThumb} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    minHeight: 44,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  statusGlyph: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  switchTrack: {
    width: 26,
    height: 14,
    borderRadius: 7,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchThumb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
