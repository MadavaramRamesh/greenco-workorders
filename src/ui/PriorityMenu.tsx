import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Priority } from '../domain/types';
import { useTheme } from '../domain/theme';

export type PriorityFilterOption = 'All' | Priority;

export interface PriorityMenuProps {
  selectedPriority: PriorityFilterOption;
  onChange: (priority: PriorityFilterOption) => void;
  style?: object;
}

const PRIORITY_OPTIONS: PriorityFilterOption[] = [
  'All',
  'Critical',
  'High',
  'Medium',
  'Low',
];

/**
 * Filter header row showing "Sorted by urgency" on left
 * and a Priority dropdown menu button on the right.
 * Minimum touch target >= 44px.
 */
export function PriorityMenu({
  selectedPriority,
  onChange,
  style,
}: PriorityMenuProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const getPriorityColor = (p: PriorityFilterOption) => {
    switch (p) {
      case 'Critical':
        return theme.critical.text;
      case 'High':
        return theme.high.text;
      case 'Medium':
        return theme.medium.text;
      case 'Low':
        return theme.low.text;
      default:
        return theme.text;
    }
  };

  return (
    <>
      <View style={[styles.container, style]}>
        <Text style={[styles.sortedText, { color: theme.textSecondary }]}>
          Sorted by urgency
        </Text>

        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Priority filter, currently ${selectedPriority}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.menuButton,
            {
              backgroundColor: theme.isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: theme.separator,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.menuButtonText, { color: theme.text }]}>
            Priority:{' '}
            <Text style={{ color: getPriorityColor(selectedPriority), fontWeight: '600' }}>
              {selectedPriority}
            </Text>
            {'  ▾'}
          </Text>
        </Pressable>
      </View>

      {/* iOS Modal Action Sheet for Priority Selection */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.separator,
                  },
                ]}
              >
                <Text style={[styles.modalTitle, { color: theme.textSecondary }]}>
                  FILTER BY PRIORITY
                </Text>

                {PRIORITY_OPTIONS.map((option, idx) => {
                  const isSelected = option === selectedPriority;
                  const isLast = idx === PRIORITY_OPTIONS.length - 1;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        onChange(option);
                        setModalVisible(false);
                      }}
                      style={({ pressed }) => [
                        styles.modalOption,
                        !isLast && { borderBottomColor: theme.separator, borderBottomWidth: StyleSheet.hairlineWidth },
                        pressed && { backgroundColor: theme.isDark ? '#2C2C2E' : '#F2F2F7' },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select priority ${option}`}
                    >
                      <View style={styles.optionLeft}>
                        {option !== 'All' && (
                          <View
                            style={[
                              styles.priorityBadgeDot,
                              { backgroundColor: getPriorityColor(option) },
                            ]}
                          />
                        )}
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected ? theme.brand : theme.text,
                              fontWeight: isSelected ? '600' : '400',
                            },
                          ]}
                        >
                          {option}
                        </Text>
                      </View>

                      {isSelected && (
                        <Text style={[styles.checkMark, { color: theme.brand }]}>
                          ✓
                        </Text>
                      )}
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={[styles.cancelButton, { borderTopColor: theme.separator }]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[styles.cancelButtonText, { color: theme.brand }]}>
                    Done
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  sortedText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  menuButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    fontSize: 16,
  },
  checkMark: {
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
