import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useOffline } from '../hooks/useOffline';
import { usePendingCount } from '../hooks/usePendingCount';
import { useSync } from '../hooks/useSync';
import { useTheme } from '../domain/theme';
import { StatusBar } from './StatusBar';

export interface SummaryCardProps {
  total: number;
  overdueCount: number;
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  style?: object;
}

/**
 * Summary card at top of Overview screen:
 * - Total work orders count & overdue count in red
 * - Thin stacked status bar chart with legend
 * - Hairline separator
 * - Pending sync row with outbox count and Sync Now button
 */
export function SummaryCard({
  total,
  overdueCount,
  openCount,
  inProgressCount,
  completedCount,
  style,
}: SummaryCardProps) {
  const theme = useTheme();
  const { count: pendingCount } = usePendingCount();
  const { isOffline } = useOffline();
  const { isSyncing, lastSyncedAt, syncNow } = useSync();
  const [justSynced, setJustSynced] = useState(false);

  const handleSync = async () => {
    if (isOffline || isSyncing) return;
    const res = await syncNow();
    if (res && res.remaining === 0) {
      setJustSynced(true);
    }
  };

  const isSyncDisabled = isOffline || isSyncing;

  const orderText = total === 1 ? '1 work order' : `${total} work orders`;
  const overdueText = overdueCount === 1 ? '1 overdue' : `${overdueCount} overdue`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.separator,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    >
      {/* Header: Total Count & Overdue Count */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.totalText, { color: theme.text }]}>
            {orderText}
          </Text>
          <Text style={[styles.plantSubtitle, { color: theme.textSecondary }]}>
            {' '}· Plant Total
          </Text>
        </View>

        {overdueCount > 0 ? (
          <View
            style={[
              styles.overdueBadge,
              {
                backgroundColor: theme.critical.background,
                borderColor: theme.critical.fill,
              },
            ]}
          >
            <Text style={[styles.overdueBadgeText, { color: theme.critical.text }]}>
              {overdueText}
            </Text>
          </View>
        ) : (
          <Text style={[styles.overdueText, { color: theme.textSecondary }]}>
            {overdueText}
          </Text>
        )}
      </View>

      {/* Chart: Thin stacked status bar with legend */}
      <StatusBar
        openCount={openCount}
        inProgressCount={inProgressCount}
        completedCount={completedCount}
      />

      {/* Hairline Separator */}
      <View style={[styles.separator, { backgroundColor: theme.separator }]} />

      {/* Pending Row */}
      <View style={styles.pendingRow}>
        <View style={styles.pendingInfo}>
          {isSyncing ? (
            <View style={styles.pendingBadgeRow}>
              <ActivityIndicator
                size="small"
                color={theme.pendingSync.text}
                style={{ marginRight: 2 }}
              />
              <Text style={[styles.pendingText, { color: theme.pendingSync.text }]}>
                Syncing changes...
              </Text>
            </View>
          ) : pendingCount > 0 ? (
            <View style={styles.pendingBadgeRow}>
              <Text style={[styles.pendingCloudIcon, { color: theme.pendingSync.text }]}>
                ☁↑
              </Text>
              <Text style={[styles.pendingText, { color: theme.pendingSync.text }]}>
                {pendingCount} {pendingCount === 1 ? 'change waiting' : 'changes waiting'}
              </Text>
            </View>
          ) : (
            <View style={styles.syncedBadgeRow}>
              <Text style={[styles.syncedCheckIcon, { color: theme.completed.text }]}>
                ✓
              </Text>
              <Text style={[styles.syncedText, { color: theme.completed.text }]}>
                {justSynced || lastSyncedAt
                  ? 'All changes synced · just now'
                  : 'All changes synced'}
              </Text>
            </View>
          )}
        </View>

        {/* Sync Now Button */}
        <Pressable
          onPress={handleSync}
          disabled={isSyncDisabled}
          accessibilityRole="button"
          accessibilityLabel="Sync Now"
          accessibilityState={{ disabled: isSyncDisabled, busy: isSyncing }}
          style={({ pressed }) => [
            styles.syncButton,
            {
              backgroundColor: isSyncDisabled
                ? theme.disabled
                : pressed
                ? theme.brandText
                : theme.brand,
              opacity: isSyncDisabled ? 0.7 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {isSyncing ? (
            <ActivityIndicator
              size="small"
              color={theme.isDark ? theme.brand : theme.brand}
            />
          ) : (
            <Text
              style={[
                styles.syncButtonText,
                {
                  color: isSyncDisabled
                    ? theme.disabledText
                    : theme.brandText,
                },
              ]}
            >
              Sync Now
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  plantSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  overdueText: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginVertical: 2,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  pendingInfo: {
    flex: 1,
    marginRight: 12,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingCloudIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncedCheckIcon: {
    fontSize: 15,
    fontWeight: '700',
  },
  syncedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  syncButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

