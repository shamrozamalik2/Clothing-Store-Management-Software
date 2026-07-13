import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'sas_theme';
const SIDEBAR_KEY = 'sas_sidebar';

const initialState = {
  theme: localStorage.getItem(THEME_KEY) || 'dark',
  sidebarCollapsed: localStorage.getItem(SIDEBAR_KEY) === 'true',
  pageTitle: 'Dashboard',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, { payload }) {
      state.theme = payload;
      localStorage.setItem(THEME_KEY, payload);
      document.documentElement.className = payload;
    },
    toggleTheme(state) {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = next;
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.className = next;
    },
    setSidebarCollapsed(state, { payload }) {
      state.sidebarCollapsed = payload;
      localStorage.setItem(SIDEBAR_KEY, String(payload));
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem(SIDEBAR_KEY, String(state.sidebarCollapsed));
    },
    setPageTitle(state, { payload }) {
      state.pageTitle = payload;
      document.title = `${payload} – SAS Garments`;
    },
  },
});

export const { setTheme, toggleTheme, setSidebarCollapsed, toggleSidebar, setPageTitle } = uiSlice.actions;

export const selectTheme           = (state) => state.ui.theme;
export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed;
export const selectPageTitle       = (state) => state.ui.pageTitle;

export default uiSlice.reducer;
