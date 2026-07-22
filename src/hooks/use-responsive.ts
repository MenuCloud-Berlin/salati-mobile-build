import { useWindowDimensions } from 'react-native';

import { MaxContentWidth } from '@/constants/theme';

const TABLET_BREAKPOINT = 700;
const LARGE_TABLET_BREAKPOINT = 1000;

export interface Responsive {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  /** Recommended column count for tile/menu grids (1 on phones, 2/3 on tablets). */
  columns: number;
  /** Style props to center content and cap its width on tablets/foldables. */
  centeredContent: { alignSelf: 'center'; width: '100%'; maxWidth: number };
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isLargeTablet = width >= LARGE_TABLET_BREAKPOINT;
  const columns = isLargeTablet ? 3 : isTablet ? 2 : 1;

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    columns,
    centeredContent: { alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  };
}
