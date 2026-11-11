import {
  CellStyleModule,
  ClientSideRowModelModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  TextFilterModule,
  ValidationModule,
  themeQuartz,
} from 'ag-grid-community'

// Register only the grid features we use (instead of AllCommunityModule) to keep the bundle small.
ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
  PaginationModule,
  TextFilterModule,
  NumberFilterModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
])

export const gridTheme = themeQuartz.withParams({
  fontFamily: 'inherit',
  fontSize: 14,
  headerFontWeight: 600,
  accentColor: '#2a78d6',
  borderColor: 'rgba(11, 11, 11, 0.1)',
  headerBackgroundColor: '#f9f9f7',
  backgroundColor: '#fcfcfb',
  rowHoverColor: '#f3f2ee',
  wrapperBorderRadius: 10,
})
