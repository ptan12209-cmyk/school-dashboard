// attendanceSlice.js - Redux slice for attendance management
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import attendanceService from '../../services/attendanceService'; // Assuming a service exists

const initialState = {
  attendanceRecords: [],
  loading: false,
  error: null,
};

// Example async thunk for fetching attendance
export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAttendance',
  async (params, { rejectWithValue }) => {
    // TODO: Implement when attendanceService is ready
    // try {
    //   const response = await attendanceService.getAttendance(params);
    //   return response.data;
    // } catch (error) {
    //   return rejectWithValue(error.response?.data?.message || 'Failed to fetch attendance');
    // }
    return []; // Returning mock data for now
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.attendanceRecords = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default attendanceSlice.reducer;
