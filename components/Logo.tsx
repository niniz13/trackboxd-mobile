import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#ff2d95" />
          <Stop offset="100%" stopColor="#7b2dff" />
        </LinearGradient>
      </Defs>
      <Circle cx="40" cy="40" r="32" fill="url(#g)" />
      <Circle cx="40" cy="40" r="22" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
      <Circle cx="40" cy="40" r="17" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      <Circle cx="40" cy="40" r="12" fill="#0c0b0e" fillOpacity="0.7" />
      <Circle cx="40" cy="40" r="4" fill="#ffd23f" />
    </Svg>
  );
}
