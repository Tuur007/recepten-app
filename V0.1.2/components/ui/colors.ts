/**
 * Colors Export (Backward Compatibility)
 * Re-exports from themes.ts for existing code
 */
 
export { getTheme, lightTheme, darkTheme, ThemeColors, ThemeMode } from './themes';
import { lightTheme } from './themes';
 
// Export light theme as default Colors for backward compatibility
export const Colors = lightTheme;
