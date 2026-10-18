import { Link, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../src/domain/theme';

export default function DetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.separator }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>WORK ORDER</Text>
        <Text style={[styles.idText, { color: theme.text }]}>{id ?? 'Unknown'}</Text>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          Detail Screen (Placeholder). Status history and details will be populated in later steps.
        </Text>
      </View>

      <View style={styles.buttonStack}>
        <Link href={{ pathname: '/order/edit', params: { id } }} asChild>
          <Pressable
            style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: theme.brand }])}
            accessibilityRole="button"
            accessibilityLabel={`Edit work order ${id}`}
          >
            <Text style={[styles.primaryButtonText, { color: theme.brandText }]}>Edit Order (Action Screen)</Text>
          </Pressable>
        </Link>

        <Pressable
          style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.separator }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Overview"
        >
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>‹ Back to Overview</Text>
        </Pressable>
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
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  idText: {
    fontSize: 24,
    fontWeight: '700',
  },
  desc: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 4,
  },
  buttonStack: {
    gap: 12,
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
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

