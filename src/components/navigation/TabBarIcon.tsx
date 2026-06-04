import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type IconName = 'home' | 'search' | 'library' | 'profile';
interface Props { name: IconName; color: string; focused: boolean; size?: number }

function HomeIcon({ color, size }: { color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

function SearchIcon({ color, size }: { color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={1.75} />
    <Path d="M15.5 15.5L21 21" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
  </Svg>;
}

function LibraryIcon({ color, size }: { color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={1.75} />
    <Rect x="10" y="4" width="4" height="16" rx="1" stroke={color} strokeWidth={1.75} />
    <Path d="M16.5 4.5L20.5 6L16.5 19.5L12.5 18L16.5 4.5Z" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
  </Svg>;
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.75} />
    <Path d="M4 20C4 17.24 7.58 15 12 15C16.42 15 20 17.24 20 20" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
  </Svg>;
}

const icons: Record<IconName, React.ComponentType<{ color: string; size: number }>> = {
  home: HomeIcon, search: SearchIcon, library: LibraryIcon, profile: ProfileIcon,
};

export function TabBarIcon({ name, color, size = 24 }: Props): React.JSX.Element {
  const Icon = icons[name];
  return <Icon color={color} size={size} />;
}
