import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Status } from '../domain/types';
import { useTheme } from '../domain/theme';

export interface ProgressStepperProps {
  currentStatus: Status;
}

const STEPS: { status: Status; label: string }[] = [
  { status: 'Open', label: 'Open' },
  { status: 'In Progress', label: 'In Progress' },
  { status: 'Completed', label: 'Completed' },
];

export function ProgressStepper({ currentStatus }: ProgressStepperProps) {
  const theme = useTheme();

  const getStatusIndex = (s: Status): number => {
    switch (s) {
      case 'Open':
        return 0;
      case 'In Progress':
        return 1;
      case 'Completed':
        return 2;
      default:
        return 0;
    }
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.separator,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={`Progress stepper: currently ${currentStatus}`}
    >
      <View style={styles.stepsContainer}>
        {STEPS.map((step, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          // Determine step glyph and colors
          let glyph = '○';
          let nodeColor = theme.textSecondary;
          let textColor = theme.textSecondary;
          let textWeight: '400' | '500' | '600' | '700' = '500';

          if (isPast) {
            glyph = '✓';
            nodeColor = theme.completed.text;
            textColor = theme.completed.text;
            textWeight = '600';
          } else if (isCurrent) {
            if (step.status === 'Completed') {
              glyph = '✓';
              nodeColor = theme.completed.text;
              textColor = theme.completed.text;
            } else if (step.status === 'In Progress') {
              glyph = '●';
              nodeColor = theme.inProgress.fill;
              textColor = theme.inProgress.text;
            } else {
              glyph = '●';
              nodeColor = theme.open.fill;
              textColor = theme.open.text;
            }
            textWeight = '700';
          } else if (isFuture) {
            glyph = '○';
            nodeColor = theme.textSecondary;
            textColor = theme.textSecondary;
            textWeight = '400';
          }

          const showLineAfter = idx < STEPS.length - 1;
          const isLineActive = currentIndex > idx;

          return (
            <React.Fragment key={step.status}>
              {/* Step Node */}
              <View style={styles.stepNode}>
                <Text style={[styles.stepGlyph, { color: nodeColor }]}>
                  {glyph}
                </Text>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: textColor,
                      fontWeight: textWeight,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {/* Connecting Line */}
              {showLineAfter && (
                <View style={styles.lineContainer}>
                  <View
                    style={[
                      styles.line,
                      {
                        backgroundColor: isLineActive
                          ? theme.completed.text
                          : theme.separator,
                      },
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepGlyph: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 13,
  },
  lineContainer: {
    flex: 1,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
});
