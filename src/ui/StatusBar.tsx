import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../domain/theme';

export interface StatusBarProps {
  openCount: number;
  inProgressCount: number;
  completedCount: number;
}

/**
 * Proportional thin stacked horizontal bar chart representing
 * Open, In Progress, and Completed work orders, with an iOS-style legend below.
 */
export function StatusBar({
  openCount,
  inProgressCount,
  completedCount,
}: StatusBarProps) {
  const theme = useTheme();
  const total = openCount + inProgressCount + completedCount;

  const openFlex = total > 0 ? openCount : 0;
  const inProgressFlex = total > 0 ? inProgressCount : 0;
  const completedFlex = total > 0 ? completedCount : 0;

  return (
    <View style={styles.container}>
      {/* Thin stacked bar */}
      <View
        style={[
          styles.track,
          { backgroundColor: theme.isDark ? '#2C2C2E' : '#E5E5EA' },
        ]}
      >
        {total === 0 ? (
          <View style={styles.emptySegment} />
        ) : (
          <>
            {openCount > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: openFlex, backgroundColor: theme.open.fill },
                ]}
              />
            )}
            {inProgressCount > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: inProgressFlex, backgroundColor: theme.inProgress.fill },
                ]}
              />
            )}
            {completedCount > 0 && (
              <View
                style={[
                  styles.segment,
                  { flex: completedFlex, backgroundColor: theme.completed.fill },
                ]}
              />
            )}
          </>
        )}
      </View>

      {/* Legend below */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={[styles.dot, { color: theme.open.fill }]}>●</Text>
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Open <Text style={[styles.legendNumber, { color: theme.text }]}>{openCount}</Text>
          </Text>
        </View>

        <View style={styles.legendItem}>
          <Text style={[styles.dot, { color: theme.inProgress.fill }]}>●</Text>
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            In Progress <Text style={[styles.legendNumber, { color: theme.text }]}>{inProgressCount}</Text>
          </Text>
        </View>

        <View style={styles.legendItem}>
          <Text style={[styles.dot, { color: theme.completed.fill }]}>●</Text>
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Completed <Text style={[styles.legendNumber, { color: theme.text }]}>{completedCount}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 10,
  },
  track: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  emptySegment: {
    flex: 1,
  },
  segment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    fontSize: 10,
    lineHeight: 12,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '400',
  },
  legendNumber: {
    fontWeight: '600',
  },
});

