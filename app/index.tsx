import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../src/domain/theme';
import { runDevSaveTest } from '../src/data/workOrderService';

export default function OverviewScreen() {
  const theme = useTheme();
  const [isRunningDevTest, setIsRunningDevTest] = useState(false);
  const [devTestOutput, setDevTestOutput] = useState<string | null>(null);

  const handleRunDevTest = async () => {
    setIsRunningDevTest(true);
    setDevTestOutput(null);
    try {
      const result = await runDevSaveTest();
      setDevTestOutput(
        `✓ Dev test completed successfully!\n` +
        `• Validation check: ${result.validationPassed ? 'PASSED' : 'FAILED'}\n` +
        `• Update order check: ${result.updatePassed ? 'PASSED (rev: ' + result.savedOrder?.revision + ', pending_sync: 1)' : 'FAILED'}\n` +
        `• Create order check: ${result.createPassed ? 'PASSED (' + result.createdOrder?.wo_id + ')' : 'FAILED'}\n` +
        `• Outbox rows in DB: ${result.outboxCount}\n` +
        `Check terminal / console logs for full outbox rows and payloads.`
      );
    } catch (err: any) {
      setDevTestOutput(`✗ Error running dev test: ${err?.message ?? err}`);
    } finally {
      setIsRunningDevTest(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.separator }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Step 3: Repositories & Save Logic</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Theme active: {theme.scheme.toUpperCase()} mode ({theme.isDark ? 'Dark tokens' : 'Light tokens'})
        </Text>
      </View>

      {/* Dev test runner card */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.brand }]}>
        <Text style={[styles.cardTitle, { color: theme.brand }]}>Dev Test: Save & Outbox Verification</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary, marginBottom: 12 }]}>
          Executes validation check, updates WO-1001, creates a new order, and logs outbox rows and payloads.
        </Text>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.brand }]}
          onPress={handleRunDevTest}
          disabled={isRunningDevTest}
          accessibilityRole="button"
          accessibilityLabel="Run Dev Save and Outbox Test"
        >
          {isRunningDevTest ? (
            <ActivityIndicator color={theme.brandText} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: theme.brandText }]}>
              ▶ Run Dev Save & Outbox Test
            </Text>
          )}
        </Pressable>

        {devTestOutput ? (
          <View style={[styles.outputBox, { backgroundColor: theme.isDark ? '#1c1c1e' : '#f2f2f7' }]}>
            <Text style={[styles.outputText, { color: theme.text }]}>{devTestOutput}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>SAMPLE WORK ORDERS</Text>

        <Pressable
          style={[styles.row, { backgroundColor: theme.card, borderBottomColor: theme.separator }]}
          onPress={() => router.push('/order/WO-1001')}
          accessibilityRole="button"
          accessibilityLabel="Open order WO-1001"
        >
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Inspect turbine gearbox</Text>
            <Text style={[styles.rowMeta, { color: theme.high.text }]}>High · WO-1001 · WTG-101</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        </Pressable>

        <Pressable
          style={[styles.row, { backgroundColor: theme.card, borderBottomColor: theme.separator }]}
          onPress={() => router.push('/order/WO-1002')}
          accessibilityRole="button"
          accessibilityLabel="Open order WO-1002"
        >
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Review inverter fault</Text>
            <Text style={[styles.rowMeta, { color: theme.critical.text }]}>Critical · WO-1002 · INV-201</Text>
          </View>
          <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.actionContainer}>
        <Link href="/order/edit" asChild>
          <Pressable
            style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: theme.brand }])}
            accessibilityRole="button"
            accessibilityLabel="Create New Order"
          >
            <Text style={[styles.primaryButtonText, { color: theme.brandText }]}>+ New Order (Action)</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  outputBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  outputText: {
    fontSize: 13,
    fontFamily: 'System',
    lineHeight: 18,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
  actionContainer: {
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
