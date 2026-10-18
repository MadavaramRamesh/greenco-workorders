import { Link, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../src/domain/theme';

export default function ActionScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.separator }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {isEditing ? 'EDIT WORK ORDER' : 'NEW WORK ORDER'}
        </Text>
        <Text style={[styles.heading, { color: theme.text }]}>
          {isEditing ? `Order ${id}` : 'Create Work Order'}
        </Text>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          Action Screen (Placeholder). Validation and transactional SQLite outbox saving will be implemented in later steps.
        </Text>
      </View>

      <View style={styles.buttonStack}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.brand }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Save changes and return' : 'Save work order and return'}
        >
          <Text style={[styles.primaryButtonText, { color: theme.brandText }]}>
            {isEditing ? 'Save Changes' : 'Save Work Order'}
          </Text>
        </Pressable>

        {isEditing && (
          <Link href={`/order/${id}`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.secondaryButton,
                { backgroundColor: theme.card, borderColor: theme.separator },
              ])}
              accessibilityRole="button"
              accessibilityLabel={`View detail for order ${id}`}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>View Order Detail ({id})</Text>
            </Pressable>
          </Link>
        )}

        <Pressable
          style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.separator }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel and return"
        >
          <Text style={[styles.secondaryButtonText, { color: theme.error }]}>Cancel</Text>
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
  heading: {
    fontSize: 22,
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

