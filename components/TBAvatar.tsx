import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { F } from '../constants/theme';
import type { User } from '../constants/data';

interface Props { user: User; size?: number; ring?: boolean; }

export function TBAvatar({ user, size = 36, ring = false }: Props) {
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: user.color },
      ring && { shadowColor: user.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
    ]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{user.initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: F.headline, color: '#0c0b0e', fontWeight: '800' },
});
