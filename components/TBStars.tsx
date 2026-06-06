import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TBIcon } from './TBIcon';

interface StarsProps { rating: number; size?: number; color?: string; }
export function TBStars({ rating, size = 14, color = '#fff' }: StarsProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={styles.row}>
      {[0,1,2,3,4].map(i => {
        const isFull = i < full;
        const isHalf = i === full && half;
        return (
          <View key={i} style={{ width: size, height: size, position: 'relative' }}>
            <TBIcon name="star" size={size} color={color} fill="none" strokeWidth={1.6} />
            {(isFull || isHalf) && (
              <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', width: isHalf ? size / 2 : size }]}>
                <TBIcon name="star" size={size} color={color} fill={color} strokeWidth={1.6} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

interface InputProps { value: number; onChange: (v: number) => void; size?: number; color?: string; }
export function TBStarInput({ value, onChange, size = 40, color = '#fff' }: InputProps) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <View style={styles.row}>
      {[1,2,3,4,5].map(i => {
        const isFull = i <= Math.floor(shown);
        const isHalf = Math.abs(i - shown) < 0.6 && shown < i;
        return (
          <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.7}>
            <View style={{ width: size, height: size, position: 'relative' }}>
              <TBIcon name="star" size={size} color={color} fill="none" strokeWidth={1.4} />
              {isFull && (
                <View style={[StyleSheet.absoluteFill]}>
                  <TBIcon name="star" size={size} color={color} fill={color} strokeWidth={1.4} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 2 } });
