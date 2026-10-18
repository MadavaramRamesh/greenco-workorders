import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FieldErrors,
  Priority,
  SaveWorkOrderInput,
  Status,
} from '../../src/domain/types';
import {
  hasValidationErrors,
  validateWorkOrder,
} from '../../src/domain/validation';
import { useTheme } from '../../src/domain/theme';
import {
  PLANT_ASSETS,
  PlantAsset,
  TECHNICIANS,
  formatDisplayDate,
  getAssetGlyph,
  getAssetLabel,
} from '../../src/domain/asset';
import { getOrder, saveWorkOrder } from '../../src/data/workOrderService';
import { useOffline } from '../../src/hooks/useOffline';
import { SegmentedControl } from '../../src/ui/SegmentedControl';

const PRIORITIES: readonly Priority[] = ['Low', 'Medium', 'High', 'Critical'] as const;
const STATUSES: readonly Status[] = ['Open', 'In Progress', 'Completed'] as const;

export default function ActionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { isOffline } = useOffline();

  // Form State
  const [title, setTitle] = useState('');
  const [assetId, setAssetId] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<Status>('Open');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // UI & Loading States
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Modals for selection
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [assignedModalVisible, setAssignedModalVisible] = useState(false);
  const [customAssetInput, setCustomAssetInput] = useState('');
  const [customTechnicianInput, setCustomTechnicianInput] = useState('');

  // Load existing work order if in edit mode
  useEffect(() => {
    if (!id) {
      // In create mode: sensible default plant asset
      setAssetId('WTG-101');
      // Default due date to today
      const today = new Date().toISOString().slice(0, 10);
      setDueDate(today);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setNotFound(false);

    getOrder(id)
      .then((order) => {
        if (!isMounted) return;
        if (!order) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        setTitle(order.title);
        setAssetId(order.asset_id);
        setPriority(order.priority);
        setStatus(order.status);
        setDueDate(order.due_date ?? '');
        setAssignedTo(order.assigned_to ?? '');
        setIsLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[ActionScreen] Failed to load order for editing:', err);
          setNotFound(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Date Preset Helpers
  const presetDates = useMemo(() => {
    const today = new Date();
    const format = (d: Date) => d.toISOString().slice(0, 10);

    const todayDate = new Date(today);
    const in3Days = new Date(today.getTime() + 3 * 86400000);
    const in7Days = new Date(today.getTime() + 7 * 86400000);
    const in14Days = new Date(today.getTime() + 14 * 86400000);

    return [
      { label: 'Today', value: format(todayDate) },
      { label: '+3 Days', value: format(in3Days) },
      { label: '+1 Week', value: format(in7Days) },
      { label: '+2 Weeks', value: format(in14Days) },
    ];
  }, []);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedAssetId = assetId.trim();
    const trimmedDueDate = dueDate.trim();
    const trimmedAssignedTo = assignedTo.trim();

    const input: SaveWorkOrderInput = {
      wo_id: isEditing && id ? id : undefined,
      title: trimmedTitle,
      asset_id: trimmedAssetId,
      priority,
      status,
      due_date: trimmedDueDate.length > 0 ? trimmedDueDate : null,
      assigned_to: trimmedAssignedTo.length > 0 ? trimmedAssignedTo : null,
    };

    // 1. Validation check
    const validationErrors = validateWorkOrder(input);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    // 2. Clear any errors and execute save
    setErrors({});
    setIsSaving(true);

    try {
      const result = await saveWorkOrder(input);
      if (result.success) {
        router.back();
      } else {
        setErrors(result.errors);
      }
    } catch (err) {
      console.error('[ActionScreen] saveWorkOrder error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAsset = (selectedId: string) => {
    setAssetId(selectedId);
    if (errors.asset_id) {
      setErrors((prev) => ({ ...prev, asset_id: undefined }));
    }
    setAssetModalVisible(false);
  };

  const handleSelectTechnician = (tech: string) => {
    setAssignedTo(tech);
    setAssignedModalVisible(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: isEditing ? 'Edit Work Order' : 'New Work Order',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.headerButton}
              >
                <Text style={[styles.headerButtonText, { color: theme.brand }]}>Cancel</Text>
              </Pressable>
            ),
          }}
        />
        <ActivityIndicator size="large" color={theme.brand} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading work order...
        </Text>
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            title: 'Not Found',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.headerButton}
              >
                <Text style={[styles.headerButtonText, { color: theme.brand }]}>Cancel</Text>
              </Pressable>
            ),
          }}
        />
        <Text style={[styles.notFoundTitle, { color: theme.error }]}>Work Order Not Found</Text>
        <Text style={[styles.notFoundSub, { color: theme.textSecondary }]}>
          The work order "{id}" could not be located.
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Return to previous screen"
          style={[styles.primaryButton, { backgroundColor: theme.brand, marginTop: 16 }]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.brandText }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Work Order' : 'New Work Order',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={styles.headerButton}
            >
              <Text style={[styles.headerButtonText, { color: theme.brand }]}>Cancel</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom + 40, 50),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TITLE FIELD */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TITLE</Text>
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: theme.card,
                borderColor: errors.title ? theme.error : theme.separator,
                borderWidth: errors.title ? 1.5 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              placeholder="Enter title (at least 3 characters)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.textInput, { color: theme.text }]}
              accessibilityLabel="Work order title input"
              autoCapitalize="sentences"
            />
          </View>
          {Boolean(errors.title) && (
            <Text style={[styles.errorText, { color: theme.error }]} accessibilityRole="alert">
              {errors.title}
            </Text>
          )}
        </View>

        {/* 2. ASSET ROW SELECTOR */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>ASSET</Text>
          <Pressable
            onPress={() => setAssetModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Asset ${assetId ? getAssetLabel(assetId) : 'None selected'}`}
            style={[
              styles.rowSelector,
              {
                backgroundColor: theme.card,
                borderColor: errors.asset_id ? theme.error : theme.separator,
                borderWidth: errors.asset_id ? 1.5 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              {Boolean(assetId) && (
                <Text style={styles.assetGlyph}>{getAssetGlyph(assetId)}</Text>
              )}
              <Text style={[styles.rowLabel, { color: theme.text }]}>Asset</Text>
            </View>
            <View style={styles.rowRight}>
              <Text
                style={[
                  styles.rowValue,
                  { color: assetId ? theme.text : theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {assetId ? `${assetId} · ${getAssetLabel(assetId)}` : 'Select asset ›'}
              </Text>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
            </View>
          </Pressable>
          {Boolean(errors.asset_id) && (
            <Text style={[styles.errorText, { color: theme.error }]} accessibilityRole="alert">
              {errors.asset_id}
            </Text>
          )}
        </View>

        {/* 3. PRIORITY SEGMENTED CONTROL */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PRIORITY</Text>
          <View
            style={[
              styles.segmentedWrapper,
              Boolean(errors.priority) && {
                borderColor: theme.error,
                borderWidth: 1.5,
                borderRadius: 12,
              },
            ]}
          >
            <SegmentedControl
              values={PRIORITIES}
              selectedValue={priority}
              onChange={(p) => {
                setPriority(p);
                if (errors.priority) {
                  setErrors((prev) => ({ ...prev, priority: undefined }));
                }
              }}
            />
          </View>
          {Boolean(errors.priority) && (
            <Text style={[styles.errorText, { color: theme.error }]} accessibilityRole="alert">
              {errors.priority}
            </Text>
          )}
        </View>

        {/* 4. STATUS SEGMENTED CONTROL */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>STATUS</Text>
          <View
            style={[
              styles.segmentedWrapper,
              Boolean(errors.status) && {
                borderColor: theme.error,
                borderWidth: 1.5,
                borderRadius: 12,
              },
            ]}
          >
            <SegmentedControl
              values={STATUSES}
              selectedValue={status}
              onChange={(s) => {
                setStatus(s);
                if (errors.status) {
                  setErrors((prev) => ({ ...prev, status: undefined }));
                }
              }}
            />
          </View>
          {Boolean(errors.status) && (
            <Text style={[styles.errorText, { color: theme.error }]} accessibilityRole="alert">
              {errors.status}
            </Text>
          )}
        </View>

        {/* 5. DUE DATE FIELD & PRESETS */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DUE DATE</Text>
          <View
            style={[
              styles.rowSelector,
              {
                backgroundColor: theme.card,
                borderColor: errors.due_date ? theme.error : theme.separator,
                borderWidth: errors.due_date ? 1.5 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>Due Date</Text>
            <View style={styles.dueDateRowRight}>
              <TextInput
                value={dueDate}
                onChangeText={(text) => {
                  setDueDate(text);
                  if (errors.due_date) {
                    setErrors((prev) => ({ ...prev, due_date: undefined }));
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={[styles.dueDateInput, { color: theme.text }]}
                accessibilityLabel="Due date YYYY-MM-DD"
                autoCorrect={false}
                maxLength={10}
              />
              {Boolean(dueDate && !errors.due_date) && (
                <Text style={[styles.formattedDateBadge, { color: theme.textSecondary }]}>
                  {formatDisplayDate(dueDate)}
                </Text>
              )}
            </View>
          </View>

          {/* Quick Date Presets */}
          <View style={styles.presetsContainer}>
            {presetDates.map((item) => {
              const isSelected = dueDate === item.value;
              return (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    setDueDate(item.value);
                    if (errors.due_date) {
                      setErrors((prev) => ({ ...prev, due_date: undefined }));
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Set due date to ${item.label}`}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? theme.brand : theme.card,
                      borderColor: isSelected ? theme.brand : theme.separator,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color: isSelected ? theme.brandText : theme.textSecondary,
                        fontWeight: isSelected ? '600' : '500',
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {Boolean(errors.due_date) && (
            <Text style={[styles.errorText, { color: theme.error }]} accessibilityRole="alert">
              {errors.due_date}
            </Text>
          )}
        </View>

        {/* 6. ASSIGNED TO ROW */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>ASSIGNED TO</Text>
          <Pressable
            onPress={() => setAssignedModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Assigned to ${assignedTo || 'Unassigned'}`}
            style={[
              styles.rowSelector,
              {
                backgroundColor: theme.card,
                borderColor: theme.separator,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>Assigned to</Text>
            <View style={styles.rowRight}>
              <Text
                style={[
                  styles.rowValue,
                  { color: assignedTo ? theme.text : theme.textSecondary },
                ]}
              >
                {assignedTo || 'Unassigned'}
              </Text>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
            </View>
          </Pressable>
        </View>

        {/* 7. AMBER OFFLINE NOTE (Visible only when offline) */}
        {isOffline && (
          <View
            style={[
              styles.offlineNoteCard,
              {
                backgroundColor: theme.offline.background,
                borderColor: theme.offline.fill,
              },
            ]}
            accessibilityRole="alert"
          >
            <Text style={[styles.offlineNoteIcon, { color: theme.offline.text }]}>⊘</Text>
            <Text style={[styles.offlineNoteText, { color: theme.offline.text }]}>
              You’re offline. This is saved on your device and syncs later.
            </Text>
          </View>
        )}

        {/* 8. SAVE & CANCEL BUTTONS */}
        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? 'Save Changes' : 'Save Work Order'}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: theme.brand,
                opacity: pressed || isSaving ? 0.85 : 1,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.brandText} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: theme.brandText }]}>
                {isEditing ? 'Save Changes' : 'Save Work Order'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.separator,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.error }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ASSET SELECTOR MODAL */}
      <Modal
        visible={assetModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAssetModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <Pressable
            style={styles.modalBackdropDismiss}
            onPress={() => setAssetModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.card,
                paddingBottom: Math.max(insets.bottom + 16, 24),
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Asset</Text>
              <Pressable
                onPress={() => setAssetModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close asset modal"
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: theme.brand }]}>Done</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {PLANT_ASSETS.map((asset) => {
                const isSelected = assetId === asset.id;
                return (
                  <Pressable
                    key={asset.id}
                    onPress={() => handleSelectAsset(asset.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${asset.name}`}
                    style={({ pressed }) => [
                      styles.modalOptionRow,
                      {
                        borderBottomColor: theme.separator,
                        backgroundColor: pressed ? theme.background : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.modalOptionLeft}>
                      <Text style={styles.modalOptionGlyph}>{getAssetGlyph(asset.id)}</Text>
                      <View>
                        <Text style={[styles.modalOptionTitle, { color: theme.text }]}>
                          {asset.id}
                        </Text>
                        <Text style={[styles.modalOptionDesc, { color: theme.textSecondary }]}>
                          {asset.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Text style={[styles.checkmark, { color: theme.brand }]}>✓</Text>
                    )}
                  </Pressable>
                );
              })}

              {/* Custom Asset input row */}
              <View style={[styles.customRowContainer, { borderTopColor: theme.separator }]}>
                <Text style={[styles.customLabel, { color: theme.textSecondary }]}>
                  Or Enter Custom Asset ID:
                </Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    value={customAssetInput}
                    onChangeText={setCustomAssetInput}
                    placeholder="e.g. WTG-107"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.customTextInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: theme.separator,
                      },
                    ]}
                    autoCapitalize="characters"
                  />
                  <Pressable
                    onPress={() => {
                      if (customAssetInput.trim()) {
                        handleSelectAsset(customAssetInput.trim().toUpperCase());
                        setCustomAssetInput('');
                      }
                    }}
                    style={[styles.customApplyBtn, { backgroundColor: theme.brand }]}
                  >
                    <Text style={[styles.customApplyText, { color: theme.brandText }]}>Use</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TECHNICIAN SELECTOR MODAL */}
      <Modal
        visible={assignedModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAssignedModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <Pressable
            style={styles.modalBackdropDismiss}
            onPress={() => setAssignedModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.card,
                paddingBottom: Math.max(insets.bottom + 16, 24),
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: theme.separator }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Assign Technician</Text>
              <Pressable
                onPress={() => setAssignedModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close technician modal"
                style={styles.modalCloseButton}
              >
                <Text style={[styles.modalCloseText, { color: theme.brand }]}>Done</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* Unassigned Option */}
              <Pressable
                onPress={() => handleSelectTechnician('')}
                accessibilityRole="button"
                accessibilityLabel="Unassign technician"
                style={({ pressed }) => [
                  styles.modalOptionRow,
                  {
                    borderBottomColor: theme.separator,
                    backgroundColor: pressed ? theme.background : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.modalOptionTitle, { color: theme.textSecondary }]}>
                  Unassigned
                </Text>
                {!assignedTo && (
                  <Text style={[styles.checkmark, { color: theme.brand }]}>✓</Text>
                )}
              </Pressable>

              {/* Plant Technicians */}
              {TECHNICIANS.map((tech) => {
                const isSelected = assignedTo === tech;
                return (
                  <Pressable
                    key={tech}
                    onPress={() => handleSelectTechnician(tech)}
                    accessibilityRole="button"
                    accessibilityLabel={tech}
                    style={({ pressed }) => [
                      styles.modalOptionRow,
                      {
                        borderBottomColor: theme.separator,
                        backgroundColor: pressed ? theme.background : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.modalOptionTitle, { color: theme.text }]}>
                      {tech}
                    </Text>
                    {isSelected && (
                      <Text style={[styles.checkmark, { color: theme.brand }]}>✓</Text>
                    )}
                  </Pressable>
                );
              })}

              {/* Custom Technician input row */}
              <View style={[styles.customRowContainer, { borderTopColor: theme.separator }]}>
                <Text style={[styles.customLabel, { color: theme.textSecondary }]}>
                  Or Enter Custom Technician:
                </Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    value={customTechnicianInput}
                    onChangeText={setCustomTechnicianInput}
                    placeholder="e.g. Technician E"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.customTextInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: theme.separator,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => {
                      if (customTechnicianInput.trim()) {
                        handleSelectTechnician(customTechnicianInput.trim());
                        setCustomTechnicianInput('');
                      }
                    }}
                    style={[styles.customApplyBtn, { backgroundColor: theme.brand }]}
                  >
                    <Text style={[styles.customApplyText, { color: theme.brandText }]}>Use</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  headerButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '400',
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
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  notFoundSub: {
    fontSize: 15,
    textAlign: 'center',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputCard: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    minHeight: 44,
    paddingVertical: 8,
  },
  rowSelector: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assetGlyph: {
    fontSize: 18,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'right',
    flexShrink: 1,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '400',
    marginLeft: 2,
  },
  segmentedWrapper: {
    overflow: 'hidden',
  },
  dueDateRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    justifyContent: 'flex-end',
  },
  dueDateInput: {
    fontSize: 16,
    minHeight: 44,
    textAlign: 'right',
    fontWeight: '500',
    paddingVertical: 8,
    minWidth: 105,
  },
  formattedDateBadge: {
    fontSize: 13,
    fontWeight: '500',
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  presetChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 13,
  },
  offlineNoteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  offlineNoteIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  offlineNoteText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  actionButtons: {
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    marginLeft: 6,
    marginTop: 2,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCloseButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalList: {
    paddingHorizontal: 16,
  },
  modalOptionRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalOptionGlyph: {
    fontSize: 20,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOptionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    paddingRight: 8,
  },
  customRowContainer: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTextInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  customApplyBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customApplyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
