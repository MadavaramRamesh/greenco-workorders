import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Priority, Status, WorkOrder } from '../src/domain/types';
import { useTheme } from '../src/domain/theme';
import { isOrderOverdue } from '../src/domain/urgency';
import { useWorkOrders } from '../src/hooks/useWorkOrders';
import {
  EmptyState,
  OfflineCapsule,
  OrderRow,
  PriorityFilterOption,
  PriorityMenu,
  SegmentedControl,
  SummaryCard,
} from '../src/ui';

const STATUS_OPTIONS: readonly ('All' | Status)[] = [
  'All',
  'Open',
  'In Progress',
  'Completed',
];

export default function OverviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterOption>('All');

  // 1. All work orders (used for plant-wide summary card counts)
  const { orders: allOrders } = useWorkOrders();

  // 2. Filtered work orders (sorted by urgency via listWorkOrders)
  const filterParams = useMemo(() => ({
    status: statusFilter === 'All' ? undefined : statusFilter,
    priority: priorityFilter === 'All' ? undefined : (priorityFilter as Priority),
  }), [statusFilter, priorityFilter]);

  const { orders: filteredOrders } = useWorkOrders(filterParams);

  // 3. Compute Summary Card Stats across all orders
  const summaryStats = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    allOrders.forEach((o) => {
      if (o.status === 'Open') open++;
      else if (o.status === 'In Progress') inProgress++;
      else if (o.status === 'Completed') completed++;

      if (isOrderOverdue(o)) {
        overdue++;
      }
    });

    return {
      total: allOrders.length,
      openCount: open,
      inProgressCount: inProgress,
      completedCount: completed,
      overdueCount: overdue,
    };
  }, [allOrders]);

  const handleOrderPress = (order: WorkOrder) => {
    router.push(`/order/${order.wo_id}`);
  };

  const handleClearFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
  };

  const handleNewOrderPress = () => {
    router.push('/order/edit');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Work Orders',
          headerLargeTitle: true,
          headerRight: () => <OfflineCapsule />,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 90,
          },
        ]}
      >
        {/* 1. Summary Card */}
        <SummaryCard
          total={summaryStats.total}
          overdueCount={summaryStats.overdueCount}
          openCount={summaryStats.openCount}
          inProgressCount={summaryStats.inProgressCount}
          completedCount={summaryStats.completedCount}
        />

        {/* 2. Status Segmented Control */}
        <SegmentedControl
          values={STATUS_OPTIONS}
          selectedValue={statusFilter}
          onChange={setStatusFilter}
        />

        {/* 3. Priority Menu & "Sorted by urgency" */}
        <PriorityMenu
          selectedPriority={priorityFilter}
          onChange={setPriorityFilter}
        />

        {/* 4. Inset Grouped List of Work Orders or Empty State */}
        {filteredOrders.length > 0 ? (
          <View
            style={[
              styles.listContainer,
              {
                backgroundColor: theme.card,
                borderColor: theme.separator,
              },
            ]}
          >
            {filteredOrders.map((order, index) => (
              <OrderRow
                key={order.wo_id}
                order={order}
                onPress={handleOrderPress}
                isLast={index === filteredOrders.length - 1}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            status={statusFilter}
            priority={priorityFilter}
            onClearFilters={handleClearFilters}
          />
        )}
      </ScrollView>

      {/* 5. Floating "+ New Order" Button */}
      <View
        style={[
          styles.floatingButtonContainer,
          {
            bottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
      >
        <Pressable
          onPress={handleNewOrderPress}
          accessibilityRole="button"
          accessibilityLabel="Create New Work Order"
          style={({ pressed }) => [
            styles.floatingButton,
            {
              backgroundColor: theme.brand,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.floatingButtonText, { color: theme.brandText }]}>
            + New Order
          </Text>
        </Pressable>
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
  listContainer: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  floatingButtonContainer: {
    position: 'absolute',
    right: 20,
    alignSelf: 'flex-end',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButton: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
