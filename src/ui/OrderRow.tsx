import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WorkOrder } from '../domain/types';
import { useTheme } from '../domain/theme';

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
  const getAssetGlyph = () => {
    const prefix = order.asset_id.split('-')[0]?.toUpperCase() ?? '';
    if (prefix === 'WTG') return '✇';
    if (prefix === 'INV') return '⚡';
    if (prefix === 'PMP') return '💧';
    return '⚙';
  };

  // 4. Overdue calculation
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue =
    order.status !== 'Completed' &&
    Boolean(order.due_date && order.due_date < todayStr);

  let overdueDays = 0;
  if (isOverdue && order.due_date) {
    const todayMs = new Date(todayStr).getTime();
    const dueMs = new Date(order.due_date).getTime();
    const diff = todayMs - dueMs;
    overdueDays = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  const priorityColors = getPriorityColors();
  const statusColors = getStatusColors();
  const isPending = order.pending_sync === 1;

  return (
    <Pressable
      onPress={() => onPress(order)}
      accessibilityRole="button"
      accessibilityLabel={`${order.title}, ${order.priority} priority, status ${order.status}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.separator,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
        pressed && { backgroundColor: theme.isDark ? '#2C2C2E' : '#F2F2F7' },
      ]}
    >
      {/* Colored Icon Tile (iOS Settings style) */}
      <View
        style={[
          styles.iconTile,
          {
            backgroundColor: priorityColors.fill,
          },
        ]}
      >
        <Text style={styles.tileGlyph}>{getAssetGlyph()}</Text>
      </View>

      {/* 3-line Text Content */}
      <View style={styles.content}>
        {/* Line 1: Title */}
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {order.title}
        </Text>

        {/* Line 2: Priority · WO ID · Asset ID */}
        <Text style={styles.metaLine} numberOfLines={1}>
          <Text style={[styles.priorityText, { color: priorityColors.text }]}>
            {order.priority}
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            {' · '}
            {order.wo_id}
            {' · '}
            {order.asset_id}
          </Text>
        </Text>

        {/* Line 3: Status Dot · Status · Due Date / Overdue */}
        <View style={styles.statusLine}>
          <Text style={[styles.statusDot, { color: statusColors.fill }]}>●</Text>
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {order.status}
          </Text>

          {order.due_date ? (
            <>
              <Text style={[styles.bullet, { color: theme.textSecondary }]}>·</Text>
              {isOverdue ? (
                <Text
                  style={[
                    styles.overdueNote,
                    { color: theme.critical.text },
                  ]}
                >
                  Overdue {overdueDays}d
                </Text>
              ) : (
                <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                  Due {formatDueDate(order.due_date)}
                </Text>
              )}
            </>
          ) : null}
        </View>
      </View>

      {/* Right Accessory: Pending Cloud + Chevron */}
      <View style={styles.rightAccessory}>
        {isPending && (
          <Text
            style={[styles.pendingCloud, { color: theme.pendingSync.text }]}
            accessibilityLabel="Pending synchronization"
          >
            ☁
          </Text>
        )}
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 74,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tileGlyph: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metaLine: {
    fontSize: 13,
  },
  priorityText: {
    fontWeight: '600',
  },
  statusLine: {
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
    fontWeight: '500',
  },
  bullet: {
    fontSize: 13,
  },
  overdueNote: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
  },
  rightAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 6,
  },
  pendingCloud: {
    fontSize: 17,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
});
