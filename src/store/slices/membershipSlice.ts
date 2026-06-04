import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular: boolean;
  resolution: string;
  screens: number;
  adFree: boolean;
  downloads: boolean;
  dolbyAtmos: boolean;
}

interface MembershipState {
  plans: Plan[];
  loading: boolean;
  error: string | null;
}

const initialState: MembershipState = {
  plans: [],
  loading: true,
  error: null,
};

const membershipSlice = createSlice({
  name: "membership",
  initialState,
  reducers: {
    setPlans(state, action: PayloadAction<Plan[]>) {
      state.plans = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const { setPlans, setLoading, setError } = membershipSlice.actions;

export default membershipSlice.reducer;
