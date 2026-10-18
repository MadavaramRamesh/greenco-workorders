import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Priority, Status } from '../domain/types';
import { useTheme } from '../domain/theme';

export type BadgeVariant =
  | 'priority'
  | 'status'
  | 'overdue'
  | 'pending'
  | 'synced'
  | 'custom';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  priority?: Priority;
  status?: Status;
  textColor?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: string;
}

export function Badge({
  label,
  variant = 'custom',
  priority,
  status,
  textColor,
  backgroundColor,
  size = 'md',
  style,
  textStyle,
  icon,
}: BadgeProps) {
  const theme = useTheme();

  let resolvedBg = backgroundColor ?? theme.badgeLowBg;
  let resolvedText = textColor ?? theme.text;

  if (variant === 'priority' && priority) {
    switch (priority) {
      case 'Critical':
        resolvedBg = theme.critical.background;
        resolvedText = theme.critical.text;
        break;
      case 'High':
        resolvedBg = theme.high.background;
        resolvedText = theme.high.text;
        break;
      case 'Medium':
        resolvedBg = theme.badgeMediumBg;
        resolvedText = theme.medium.text;
        break;
      case 'Low':
      default:
        resolvedBg = theme.badgeLowBg;
        resolvedText = theme.low.text;
        break;
    }
  } else if (variant === 'status' && status) {
    switch (status) {
      case 'Open':
        resolvedBg = theme.open.background;
        resolvedText = theme.open.text;
        break;
      case 'In Progress':
        resolvedBg = theme.inProgress.background;
        resolvedText = theme.inProgress.text;
        break;
      case 'Completed':
      default:
        resolvedBg = theme.completed.background;
        resolvedText = theme.completed.text;
        break;
    }
  } else if (variant === 'overdue') {
    resolvedBg = theme.critical.background;
    resolvedText = theme.critical.text;
  } else if (variant === 'pending') {
    resolvedBg = theme.pendingSync.background;
    resolvedText = theme.pendingSync.text;
  } else if (variant === 'synced') {
    resolvedBg = theme.completed.background;
    resolvedText = theme.completed.text;
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: resolvedBg },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {icon ? (
        <Text
          style={[
            styles.icon,
            isSmall ? styles.iconSm : styles.iconMd,
            { color: resolvedText },
          ]}
        >
          {icon}{' '}
        </Text>
      ) : null}
      <Text
        style={[
          styles.text,
          isSmall ? styles.textSm : styles.textMd,
          { color: resolvedText },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  textMd: {
    fontSize: 13,
    lineHeight: 16,
  },
  icon: {
    fontWeight: '600',
  },
  iconSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  iconMd: {
    fontSize: 13,
    lineHeight: 16,
  },
});

