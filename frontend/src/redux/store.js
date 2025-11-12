/**
 * Redux Store Configuration
 * =========================
 * Central state management setup with Redux Toolkit
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import userReducer from './slices/userSlice.js';
import studentReducer from './slices/studentSlice.js';
import teacherReducer from './slices/teacherSlice.js';
import courseReducer from './slices/courseSlice.js';
import gradeReducer from './slices/gradeSlice.js';
import attendanceReducer from './slices/attendanceSlice.js';
import uiReducer from './slices/uiSlice.js';
import dashboardReducer from './slices/dashboardSlice.js';
import classReducer from './slices/classSlice.js';
import notificationReducer from './slices/notificationSlice.js';
import assignmentReducer from './slices/assignmentSlice.js';


// Create store
const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    students: studentReducer,
    teachers: teacherReducer,
    courses: courseReducer,
    grades: gradeReducer,
    attendance: attendanceReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
    classes: classReducer,
    notifications: notificationReducer,
    assignments: assignmentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user.lastLogin'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// ✅ SECURITY FIX: Only expose store in development with strict check
if (typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.REACT_APP_EXPOSE_STORE === 'true') {
  window.store = store;
  console.warn('⚠️  Redux store exposed on window.store - FOR DEVELOPMENT ONLY');
}

// Export store as default
export default store;

// Also export as named export for compatibility
export { store };

// Export types (commented out for JavaScript)
// export type RootState = ReturnType<typeof store.getState>;
// export type AppDispatch = typeof store.dispatch;
