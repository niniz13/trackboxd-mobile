import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Rect, Path, Ellipse, Line, Text as SvgText } from 'react-native-svg';
import type { Album } from '../constants/data';

interface Props { album: Album; size: number; radius?: number; }

export function TBCover({ album, size, radius = 12 }: Props) {
  const { c1, c2, c3, style } = album.pal;
  const s = size;

  const artwork = () => {
    switch (style) {
      case 'rings': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          <Circle cx="50" cy="50" r="42" fill="none" stroke={c2} strokeWidth="10" opacity="0.6"/>
          <Circle cx="50" cy="50" r="28" fill="none" stroke={c3} strokeWidth="6" opacity="0.5"/>
          <Circle cx="50" cy="50" r="14" fill={c3} opacity="0.9"/>
          <Circle cx="50" cy="50" r="5" fill={c2}/>
        </Svg>
      );
      case 'split': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          <Path d="M0 0 L70 0 L30 100 L0 100Z" fill={c2} opacity="0.8"/>
          <Rect x="40" y="35" width="30" height="30" rx="4" fill={c3} opacity="0.9"/>
        </Svg>
      );
      case 'wave': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          <Path d="M0 60 Q25 40 50 60 Q75 80 100 60 L100 100 L0 100Z" fill={c2} opacity="0.7"/>
          <Path d="M0 75 Q25 55 50 75 Q75 95 100 75 L100 100 L0 100Z" fill={c3} opacity="0.5"/>
          <Circle cx="50" cy="38" r="12" fill={c3} opacity="0.9"/>
        </Svg>
      );
      case 'grid': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          {[0,1,2,3].map(row => [0,1,2,3].map(col => (
            <Rect key={`${row}-${col}`} x={col*26+2} y={row*26+2} width="22" height="22" rx="3"
              fill={(row+col)%3===0 ? c2 : (row+col)%3===1 ? c3 : c1} opacity="0.85"/>
          )))}
        </Svg>
      );
      case 'orb': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          <Circle cx="50" cy="50" r="35" fill={c2} opacity="0.5"/>
          <Circle cx="38" cy="40" r="22" fill={c3} opacity="0.7"/>
          <Circle cx="58" cy="58" r="18" fill={c1} opacity="0.6"/>
          <Circle cx="50" cy="50" r="10" fill={c2} opacity="0.9"/>
        </Svg>
      );
      case 'bars': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          {[0,1,2,3,4,5,6].map(i => (
            <Rect key={i} x={i*15+5} y={100-(20+i*10)} width="10" height={20+i*10} rx="3"
              fill={i%2===0 ? c2 : c3} opacity="0.9"/>
          ))}
        </Svg>
      );
      case 'cross': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          <Rect x="40" y="10" width="20" height="80" rx="4" fill={c2} opacity="0.8"/>
          <Rect x="10" y="40" width="80" height="20" rx="4" fill={c3} opacity="0.8"/>
          <Circle cx="50" cy="50" r="8" fill={c2}/>
        </Svg>
      );
      case 'type': return (
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Rect width="100" height="100" fill={c1}/>
          <SvgText x="10" y="52" fontSize="44" fontWeight="900" fill={c2} opacity="0.9">TB</SvgText>
          <Rect x="10" y="62" width="80" height="4" rx="2" fill={c3} opacity="0.7"/>
          <Rect x="10" y="72" width="55" height="4" rx="2" fill={c3} opacity="0.4"/>
        </Svg>
      );
    }
  };

  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}>
      {artwork()}
    </View>
  );
}
