import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';

interface Props { name: string; size?: number; color?: string; fill?: string; strokeWidth?: number; }

export function TBIcon({ name, size = 24, color = '#fff', fill = 'none', strokeWidth = 2 }: Props) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' };
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':    return <Svg {...p}><Path {...s} d="M3 10.5L12 3l9 7.5"/><Path {...s} d="M5 9.5V20h14V9.5"/></Svg>;
    case 'search':  return <Svg {...p}><Circle {...s} cx="11" cy="11" r="7"/><Path {...s} d="M21 21l-4.3-4.3"/></Svg>;
    case 'bell':    return <Svg {...p}><Path {...s} d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><Path {...s} d="M13.7 21a2 2 0 01-3.4 0"/></Svg>;
    case 'plus':    return <Svg {...p}><Path {...s} d="M12 5v14M5 12h14"/></Svg>;
    case 'heart':   return <Svg {...p}><Path stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill} d="M12 21s-7.5-4.7-10-9.5C.3 8 2 4.5 5.5 4.5c2 0 3.4 1.1 4.5 2.6C11.1 5.6 12.5 4.5 14.5 4.5 18 4.5 19.7 8 18 11.5 15.5 16.3 12 21 12 21z"/></Svg>;
    case 'star':    return <Svg {...p}><Path stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill} d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 18.6 6.1 21.8l1.2-6.6L2.5 9.5l6.6-.9z"/></Svg>;
    case 'comment': return <Svg {...p}><Path {...s} d="M21 11.5a8 8 0 01-11.6 7.1L3 21l2.4-6.4A8 8 0 1121 11.5z"/></Svg>;
    case 'back':    return <Svg {...p}><Path {...s} d="M15 6l-6 6 6 6"/></Svg>;
    case 'close':   return <Svg {...p}><Path {...s} d="M6 6l12 12M18 6L6 18"/></Svg>;
    case 'share':   return <Svg {...p}><Path {...s} d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><Path {...s} d="M12 3v13M7 8l5-5 5 5"/></Svg>;
    case 'check':   return <Svg {...p}><Path {...s} d="M4 12l5 5L20 6"/></Svg>;
    case 'settings':return <Svg {...p}><Circle {...s} cx="12" cy="12" r="3"/><Path {...s} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></Svg>;
    case 'play':    return <Svg {...p}><Path fill={color} d="M7 5l12 7-12 7z"/></Svg>;
    case 'list':    return <Svg {...p}><Path {...s} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></Svg>;
    case 'grid':    return <Svg {...p}><Rect {...s} x="3" y="3" width="7" height="7" rx="1"/><Rect {...s} x="14" y="3" width="7" height="7" rx="1"/><Rect {...s} x="3" y="14" width="7" height="7" rx="1"/><Rect {...s} x="14" y="14" width="7" height="7" rx="1"/></Svg>;
    case 'userplus':return <Svg {...p}><Circle {...s} cx="9" cy="8" r="3.5"/><Path {...s} d="M3 20c0-3.3 2.7-5.5 6-5.5 1.2 0 2.3.3 3.2.8"/><Path {...s} d="M18 13v6M15 16h6"/></Svg>;
    case 'users':   return <Svg {...p}><Circle {...s} cx="9" cy="8" r="3.2"/><Path {...s} d="M3 19.5c0-3.2 2.7-5 6-5s6 1.8 6 5"/><Path {...s} d="M16 5.2A3.2 3.2 0 0118 11M17 14.6c2.3.3 4 2 4 4.9"/></Svg>;
    case 'pen':     return <Svg {...p}><Path {...s} d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></Svg>;
    case 'profile': return <Svg {...p}><Circle {...s} cx="12" cy="8" r="4"/><Path {...s} d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></Svg>;
    case 'music':   return <Svg {...p}><Path {...s} d="M9 18V5l12-2v13"/><Circle {...s} cx="6" cy="18" r="3"/><Circle {...s} cx="18" cy="16" r="3"/></Svg>;
    case 'chevron': return <Svg {...p}><Path {...s} d="M9 6l6 6-6 6"/></Svg>;
    case 'trash':   return <Svg {...p}><Path {...s} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></Svg>;
    default:        return null;
  }
}
