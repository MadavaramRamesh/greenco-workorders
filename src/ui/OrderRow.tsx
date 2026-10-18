import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WorkOrder } from '../domain/types';
import { useTheme } from '../domain/theme';
import { getAssetGlyph } from '../domain/asset';
import { getOverdueDays, isOrderOverdue } from '../domain/urgency';

export interface OrderRowProps {
  order: WorkOrder;
  onPress: (order: WorkOrder) => void;
  isLast?: boolean;
}

/**
 * Formats a YYYY-MM-DD date into "MMM D" (e.g. "Oct 19").
 */
function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
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
 * Inset grouped list item representing a work order.
 * - Colored icon tile in iOS Settings style (priority color, asset-type glyph).
 * - Line 1: Title, purple cloud icon if pending sync, and chevron.
 * - Line 2: Priority in priority color · WO ID · Asset ID.
 * - Line 3: Status dot · status · Due date or Overdue note in red.
 * - Minimum touch target >= 54px.
 */
export function OrderRow({ order, onPress, isLast = false }: OrderRowProps) {
  const theme = useTheme();

  // 1. Priority Color
  const getPriorityColors = () => {
    switch (order.priority) {
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
  };

  // 2. Status Color
  const getStatusColors = () => {
    switch (order.status) {
      case 'Open':
        return theme.open;
      case 'In Progress':
        return theme.inProgress;
      case 'Completed':
      default:
        return theme.completed;
    }
  };

  // 3. Asset Glyph (WTG = turbine, INV = inverter, PMP = pump, other = gear)
  const assetGlyph = getAssetGlyph(order.asset_id);
  const assetPrefix = order.asset_id ? (order.asset_id.split('-')[0]?.toUpperCase() ?? '') : '';

  // 4. Overdue calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = isOrderOverdue(order, todayStr);
  const overdueDays = getOverdueDays(order.due_date, todayStr);

  const priorityColors = getPriorityColors();
  const statusColors = getStatusColors();
  const isPending = order.pending_sync === 1;

  const priorityTextColor = order.priority === 'Medium' ? '#000000' : '#FFFFFF';

  return (
    <Pressable
      onPress={() => onPress(order)}
      accessibilityRole="button"
      accessibilityLabel={`${order.title}, ${order.priority} priority, status ${order.status}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.cardPressed : theme.card,
          borderColor: theme.separator,
          shadowColor: theme.shadow,
        },
      ]}
    >
      {/* Left Column: Asset Tile with Glyph + Prefix Tag */}
      <View
        style={[
          styles.assetTile,
          {
            backgroundColor: theme.cardSecondary,
            borderColor: theme.separator,
          },
        ]}
      >
        <Text style={[styles.tileGlyph, { color: priorityColors.fill }]}>
          {assetGlyph}
        </Text>
        {assetPrefix ? (
          <Text style={[styles.tilePrefix, { color: theme.textSecondary }]}>
            {assetPrefix}
          </Text>
        ) : null}
      </View>

      {/* Right Column: Meta, Title, Status & Due Date */}
      <View style={styles.cardContent}>
        {/* Row 1: ID · Asset & Solid Priority Badge */}
        <View style={styles.topRow}>
          <Text
            style={[styles.idText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {order.wo_id} · {order.asset_id}
          </Text>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors.fill },
            ]}
          >
            <Text style={[styles.priorityBadgeText, { color: priorityTextColor }]}>
              {order.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Row 2: Title */}
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {order.title}
        </Text>

        {/* Row 3: Status Dot/Text (+ optional sync cloud) & Due / Overdue Badge */}
        <View style={styles.bottomRow}>
          <View style={styles.statusGroup}>
            <Text style={[styles.statusDot, { color: statusColors.fill }]}>●</Text>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {order.status}
            </Text>
            {isPending && (
              <Text
                style={[styles.pendingCloud, { color: theme.pendingSync.text }]}
                accessibilityLabel="Pending synchronization"
              >
                ☁
              </Text>
            )}
          </View>

          {order.due_date ? (
            isOverdue ? (
              <View
                style={[
                  styles.overdueBadge,
                  {
                    backgroundColor: theme.critical.background,
                    borderColor: theme.critical.fill,
                  },
                ]}
              >
                <Text style={[styles.overdueText, { color: theme.critical.text }]}>
                  Overdue {overdueDays}d
                </Text>
              </View>
            ) : (
              <Text style={[styles.dueText, { color: theme.textSecondary }]}>
                Due {formatDueDate(order.due_date)}
              </Text>
            )
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 88,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  assetTile: {
    width: 48,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    gap: 1,
  },
  tileGlyph: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  tilePrefix: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  idText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 20,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    fontSize: 9,
    lineHeight: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pendingCloud: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 3,
  },
  overdueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

