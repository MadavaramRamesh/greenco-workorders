import { Link, router } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../src/domain/theme';

export default function OverviewScreen() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.separator }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Overview Screen (Placeholder)</Text>
        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Theme active: {theme.scheme.toUpperCase()} mode ({theme.isDark ? 'Dark tokens' : 'Light tokens'})
        </Text>
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

