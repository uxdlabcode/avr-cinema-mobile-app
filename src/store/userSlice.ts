import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  uid: string | null;
  email: string | null;
  role: string | null;
  loading: boolean;
}

const initialState: UserState = {
  uid: null,
  email: null,
  role: null,
  loading: true,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<Omit<UserState, "loading">>) {
      state.uid = action.payload.uid;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.loading = false;
    },
    clearUser(state) {
      state.uid = null;
      state.email = null;
      state.role = null;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setUser, clearUser, setLoading } = userSlice.actions;
export default userSlice.reducer;
