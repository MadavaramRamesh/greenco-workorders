import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../domain/theme';

export interface EmptyStateProps {
  status?: string;
  priority?: string;
  onClearFilters: () => void;
  style?: object;
}

/**
 * Empty state displayed when filter combination produces no results.
 * Shows a centered icon, "No Results", dynamic explanation, and a "Clear Filters" button.
 */
export function EmptyState({
  status,
  priority,
  onClearFilters,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  // Dynamic message matched to SPEC Section 9
  let message = 'No work orders match the selected filters. Try a different status or priority.';

  if (priority && priority !== 'All' && status && status !== 'All') {
    message = `No ${priority} work orders are ${status}. Try a different status or priority.`;
  } else if (priority && priority !== 'All') {
    message = `No ${priority} work orders found. Try a different priority or status.`;
  } else if (status && status !== 'All') {
    message = `No work orders are ${status}. Try a different status or priority.`;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.separator,
        },
        style,
      ]}
    >
      <Text style={styles.icon}>📋</Text>
      <Text style={[styles.title, { color: theme.text }]}>No Results</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        {message}
      </Text>

      <Pressable
        onPress={onClearFilters}
        accessibilityRole="button"
        accessibilityLabel="Clear Filters"
        style={({ pressed }) => [
          styles.clearButton,
          {
            backgroundColor: pressed ? theme.isDark ? '#2C2C2E' : '#E5E5EA' : 'transparent',
            borderColor: theme.brand,
          },
        ]}
      >
        <Text style={[styles.clearButtonText, { color: theme.brand }]}>
          Clear Filters
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    marginVertical: 8,
  },
  icon: {
    fontSize: 40,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 6,
  },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

