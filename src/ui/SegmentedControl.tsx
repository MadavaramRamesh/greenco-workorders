import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../domain/theme';

export interface SegmentedControlProps<T extends string = string> {
  values: readonly T[];
  selectedValue: T;
  onChange: (value: T) => void;
  renderLabel?: (value: T) => string;
  style?: object;
}

/**
 * iOS-style segmented control for filtering by status or other options.
 * Uses theme tokens with minimum touch targets >= 44px.
 */
export function SegmentedControl<T extends string = string>({
  values,
  selectedValue,
  onChange,
  renderLabel,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: theme.segmentedTrack,
        },
        style,
      ]}
      accessibilityRole="radiogroup"
    >
      {values.map((val) => {
        const isSelected = val === selectedValue;
        return (
          <Pressable
            key={val}
            onPress={() => onChange(val)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={val}
            style={({ pressed }) => [
              styles.segment,
              isSelected && [
                styles.selectedSegment,
                {
                  backgroundColor: theme.segmentedSelected,
                  shadowColor: theme.shadow,
                },
              ],
              pressed && !isSelected && {
                opacity: 0.7,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? theme.text : theme.textSecondary,
                  fontWeight: isSelected ? '600' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {renderLabel ? renderLabel(val) : val}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    minHeight: 50,
    alignItems: 'center',
    width: '100%',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  selectedSegment: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});

