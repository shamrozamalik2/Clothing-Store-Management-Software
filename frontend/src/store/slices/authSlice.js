import { createSlice } from '@reduxjs/toolkit';

const TOKEN_KEY = 'sas_token';
const USER_KEY  = 'sas_user';

function loadFromStorage() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return { token, user, isAuthenticated: !!(token && user) };
  } catch {
    return { token: null, user: null, isAuthenticated: false };
  }
}

const initialState = {
  ...loadFromStorage(),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      state.token = payload.token;
      state.user  = payload.user;
      state.isAuthenticated = true;
      localStorage.setItem(TOKEN_KEY, payload.token);
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    },
    updateUser(state, { payload }) {
      state.user = { ...state.user, ...payload };
      localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    },
    clearCredentials(state) {
      state.token = null;
      state.user  = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    setToken(state, { payload }) {
      state.token = payload;
      if (payload) localStorage.setItem(TOKEN_KEY, payload);
    },
    setLoading(state, { payload }) {
      state.isLoading = payload;
    },
  },
});

export const { setCredentials, updateUser, clearCredentials, setLoading, setToken } = authSlice.actions;

// Selectors
export const selectCurrentUser  = (state) => state.auth.user;
export const selectToken        = (state) => state.auth.token;
export const selectIsAuth       = (state) => state.auth.isAuthenticated;
export const selectAuthLoading  = (state) => state.auth.isLoading;
export const selectUserRole     = (state) => state.auth.user?.role;
export const selectPermissions  = (state) => state.auth.user?.permissions || {};

export default authSlice.reducer;
