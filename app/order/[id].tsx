import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/domain/theme';
import { getAssetGlyph, getAssetLabel } from '../../src/domain/asset';
import { getOverdueDays, isOrderOverdue } from '../../src/domain/urgency';
import { useWorkOrder } from '../../src/hooks/useWorkOrder';
import { Badge, OfflineCapsule, ProgressStepper } from '../../src/ui';

/**
 * Formats a YYYY-MM-DD date into "MMM D" (e.g. "Oct 16").
 */
function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return 'None';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Formats an ISO timestamp into "MMM D, HH:mm" (e.g. "Oct 14, 09:30").
 */
function formatHistoryTimestamp(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    // If the timestamp string was recorded in UTC (ends with Z), use UTC getters
    // to preserve consistent mock/server times regardless of local timezone.
    const isUtc = isoStr.endsWith('Z');
    const month = monthNames[isUtc ? d.getUTCMonth() : d.getMonth()];
    const day = isUtc ? d.getUTCDate() : d.getDate();
    const hours = String(isUtc ? d.getUTCHours() : d.getHours()).padStart(2, '0');
    const minutes = String(isUtc ? d.getUTCMinutes() : d.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${hours}:${minutes}`;
  } catch {
    return isoStr;
  }
}

export default function DetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { order, history, loading, markCompleted } = useWorkOrder(id);
  const [isCompleting, setIsCompleting] = useState(false);

  // 1. Priority colors
  const priorityColors = useMemo(() => {
    switch (order?.priority) {
      case 'Critical':
        return theme.critical;
      case 'High':
        return theme.high;
      case 'Medium':
        return theme.medium;
      case 'Low':
      default:
        return theme.low;
    }
  }, [order?.priority, theme]);

  // 2. Status colors helper
  const getStatusFill = (status: string) => {
    switch (status) {
      case 'Open':
        return theme.open.fill;
      case 'In Progress':
        return theme.inProgress.fill;
      case 'Completed':
      default:
        return theme.completed.fill;
    }
  };

  // 3. Overdue calculation
  const overdue = order ? isOrderOverdue(order) : false;
  const overdueDays = order ? getOverdueDays(order.due_date) : 0;
  const isPending = order?.pending_sync === 1;
  const isCompleted = order?.status === 'Completed';

  // 4. Mark Completed Action
  const handleMarkCompleted = async () => {
    if (!order || isCompleted || isCompleting) return;
    try {
      setIsCompleting(true);
      await markCompleted();
    } catch (err) {
      console.error('[DetailScreen] Failed to mark completed:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  // 5. Open Edit Screen
  const handleEditPress = () => {
    if (!order) return;
    router.push({ pathname: '/order/edit', params: { id: order.wo_id } });
  };

  // 6. Loading State
  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: '',
            headerBackTitle: 'Orders',
            headerRight: () => <OfflineCapsule />,
          }}
        />
        <ActivityIndicator size="large" color={theme.brand} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading work order...
        </Text>
      </View>
    );
  }

  // 7. Not Found State
  if (!order) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: '',
            headerBackTitle: 'Orders',
            headerRight: () => <OfflineCapsule />,
          }}
        />
        <View
          style={[
            styles.notFoundCard,
            { backgroundColor: theme.card, borderColor: theme.separator },
          ]}
        >
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={[styles.notFoundTitle, { color: theme.text }]}>
            Work Order Not Found
          </Text>
          <Text style={[styles.notFoundMessage, { color: theme.textSecondary }]}>
            {id
              ? `We couldn't find a work order with ID "${id}". It may have been removed or the link is invalid.`
              : 'No work order ID was provided.'}
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            style={[styles.notFoundButton, { backgroundColor: theme.brand }]}
            accessibilityRole="button"
            accessibilityLabel="Back to Work Orders"
          >
            <Text style={[styles.notFoundButtonText, { color: theme.brandText }]}>
              ‹ Back to Work Orders
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Reverse chronological status history (newest entry first)
  const sortedHistory = [...history].reverse();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: '',
          headerBackTitle: 'Orders',
          headerRight: () => <OfflineCapsule />,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >
        {/* Header: Icon Tile, Title and IDs */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconTile,
              { backgroundColor: priorityColors.fill },
            ]}
          >
            <Text style={styles.tileGlyph}>{getAssetGlyph(order.asset_id)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text
              style={[styles.title, { color: theme.text }]}
              accessibilityRole="header"
            >
              {order.title}
            </Text>
            <Text style={[styles.idSubtitle, { color: theme.textSecondary }]}>
              {order.wo_id} · {order.asset_id}
            </Text>
          </View>
        </View>

        {/* Badges: Priority, Status, Overdue, Pending */}
        <View style={styles.badgeRow}>
          <Badge
            label={order.priority}
            variant="priority"
            priority={order.priority}
          />
          <Badge
            label={order.status}
            variant="status"
            status={order.status}
          />
          {overdue && (
            <Badge
              label={`Overdue ${overdueDays}d`}
              variant="overdue"
            />
          )}
          {isPending && (
            <Badge
              label="Pending"
              icon="☁"
              variant="pending"
            />
          )}
        </View>

        {/* Progress Stepper */}
        <ProgressStepper currentStatus={order.status} />

        {/* Grouped Details Card */}
        <View
          style={[
            styles.groupedCard,
            { backgroundColor: theme.card, borderColor: theme.separator },
          ]}
        >
          {/* Assigned To */}
          <View style={[styles.groupRow, { borderBottomColor: theme.separator }]}>
            <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
              Assigned to
            </Text>
            <Text style={[styles.groupValue, { color: theme.text }]}>
              {order.assigned_to ?? 'Unassigned'}
            </Text>
          </View>

          {/* Due Date */}
          <View style={[styles.groupRow, { borderBottomColor: theme.separator }]}>
            <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
              Due
            </Text>
            <View style={styles.dueValueContainer}>
              <Text style={[styles.groupValue, { color: theme.text }]}>
                {formatDueDate(order.due_date)}
              </Text>
              {overdue && (
                <Text style={[styles.overdueInline, { color: theme.critical.text }]}>
                  {' · '}Overdue
                </Text>
              )}
            </View>
          </View>

          {/* Asset */}
          <View style={[styles.groupRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>
              Asset
            </Text>
            <Text style={[styles.groupValue, { color: theme.text }]}>
              {getAssetLabel(order.asset_id)}
            </Text>
          </View>
        </View>

        {/* Status History Section */}
        <View style={styles.historySection}>
          <Text
            style={[styles.historySectionTitle, { color: theme.textSecondary }]}
          >
            STATUS HISTORY
          </Text>

          <View
            style={[
              styles.groupedCard,
              { backgroundColor: theme.card, borderColor: theme.separator },
            ]}
          >
            {sortedHistory.length > 0 ? (
              sortedHistory.map((item, index) => {
                const isLast = index === sortedHistory.length - 1;
                const statusDotColor = getStatusFill(item.to_status);
                const titleText = item.from_status
                  ? `Changed to ${item.to_status}`
                  : `Created as ${item.to_status}`;

                return (
                  <View
                    key={item.id ?? `${item.wo_id}-${index}`}
                    style={[
                      styles.historyItem,
                      {
                        borderBottomColor: theme.separator,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    {/* Status dot */}
                    <Text style={[styles.historyDot, { color: statusDotColor }]}>
                      ●
                    </Text>

                    {/* Content */}
                    <View style={styles.historyContent}>
                      <Text
                        style={[styles.historyActionTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {titleText}
                      </Text>
                      <Text
                        style={[
                          styles.historyMeta,
                          { color: theme.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {formatHistoryTimestamp(item.changed_at)}
                        {order.assigned_to ? ` · ${order.assigned_to}` : ''}
                      </Text>
                    </View>

                    {/* Pending or Synced Badge */}
                    <View style={styles.historyBadgeContainer}>
                      {item.synced === 1 ? (
                        <Badge label="Synced" variant="synced" size="sm" />
                      ) : (
                        <Badge label="Pending" variant="pending" size="sm" />
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyHistoryBox}>
                <Text
                  style={[styles.emptyHistoryText, { color: theme.textSecondary }]}
                >
                  No status history recorded.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.separator,
            paddingBottom: Math.max(insets.bottom + 8, 16),
          },
        ]}
      >
        <View style={styles.bottomBarInner}>
          {/* Edit Button */}
          <Pressable
            onPress={handleEditPress}
            style={({ pressed }) => [
              styles.editButton,
              {
                backgroundColor: theme.isDark ? '#2C2C2E' : '#F2F2F7',
                borderColor: theme.separator,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Edit work order ${order.wo_id}`}
          >
            <Text style={[styles.editButtonText, { color: theme.text }]}>
              Edit
            </Text>
          </Pressable>

          {/* Mark Completed Button */}
          <Pressable
            onPress={handleMarkCompleted}
            disabled={isCompleted || isCompleting}
            style={({ pressed }) => [
              styles.completeButton,
              {
                backgroundColor: isCompleted
                  ? theme.completed.background
                  : theme.brand,
                borderColor: isCompleted ? theme.completed.fill : 'transparent',
                borderWidth: isCompleted ? 1 : 0,
                opacity: isCompleted ? 0.9 : pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isCompleted
                ? 'Work order is already completed'
                : 'Mark work order as completed'
            }
          >
            {isCompleting ? (
              <ActivityIndicator
                size="small"
                color={isCompleted ? theme.completed.text : theme.brandText}
              />
            ) : (
              <Text
                style={[
                  styles.completeButtonText,
                  {
                    color: isCompleted
                      ? theme.completed.text
                      : theme.brandText,
                  },
                ]}
              >
                {isCompleted ? 'Completed ✓' : 'Mark Completed'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  centerContainer: {
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
  notFoundCard: {
    maxWidth: 400,
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  notFoundIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  notFoundMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  notFoundButton: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  notFoundButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileGlyph: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 25,
  },
  idSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupedCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupLabel: {
    fontSize: 15,
  },
  groupValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  dueValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueInline: {
    fontSize: 15,
    fontWeight: '600',
  },
  historySection: {
    gap: 8,
    marginTop: 4,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  historyDot: {
    fontSize: 11,
    marginRight: 10,
    lineHeight: 14,
  },
  historyContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  historyActionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyMeta: {
    fontSize: 12,
  },
  historyBadgeContainer: {
    marginLeft: 10,
  },
  emptyHistoryBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  editButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 2,
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
