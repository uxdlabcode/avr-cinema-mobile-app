import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { getFunctions, httpsCallable } from "firebase/functions";

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
  paymentProcessing: boolean;
  error: string | null;
}

export const createRazorpayOrderAsync = createAsyncThunk(
  "membership/createRazorpayOrder",
  async (
    { planId, price, name, description, userId }: { planId: string; price: number; name: string; description: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      const functions = getFunctions();
      const createRazorpayOrder = httpsCallable(functions, "createRazorpayOrder");

      const response = await createRazorpayOrder({ planId, price, name, description, userId });
      const data = response.data as { orderId: string; amount: number; currency: string };

      if (!data.orderId) {
        return rejectWithValue("Invalid order response from server");
      }

      return data;
    } catch (error: any) {
      // Firebase httpsCallable wraps errors in a specific format
      const errorMessage = error?.message || "Failed to create payment order";

      // Check for specific Firebase/network errors
      if (error?.code === "functions/unavailable") {
        return rejectWithValue("Payment service is temporarily unavailable. Please try again later.");
      }
      if (error?.code === "functions/internal") {
        return rejectWithValue("Payment service error. Please try again later.");
      }
      if (error?.code === "functions/unauthenticated") {
        return rejectWithValue("Authentication error. Please sign in again.");
      }

      return rejectWithValue(errorMessage);
    }
  }
);

export const verifyRazorpayPaymentAsync = createAsyncThunk(
  "membership/verifyRazorpayPayment",
  async (
    { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId, amount, currency }:
      { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; userId: string; planId: string; amount: number; currency: string },
    { rejectWithValue }
  ) => {
    try {
      const functions = getFunctions();
      const verifyRazorpayPayment = httpsCallable(functions, "verifyRazorpayPayment");

      const response = await verifyRazorpayPayment({
        razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId, amount, currency
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error?.message || "Payment verification failed";

      if (error?.code === "functions/permission-denied") {
        return rejectWithValue("Payment signature verification failed. Please contact support.");
      }
      if (error?.code === "functions/unavailable") {
        return rejectWithValue("Verification service unavailable. Your payment may have been processed. Please contact support.");
      }

      return rejectWithValue(errorMessage);
    }
  }
);

const initialState: MembershipState = {
  plans: [],
  loading: true,
  paymentProcessing: false,
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
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRazorpayOrderAsync.pending, (state) => {
        state.paymentProcessing = true;
        state.error = null;
      })
      .addCase(createRazorpayOrderAsync.fulfilled, (state) => {
        state.paymentProcessing = false;
      })
      .addCase(createRazorpayOrderAsync.rejected, (state, action) => {
        state.paymentProcessing = false;
        state.error = action.payload as string;
      })
      .addCase(verifyRazorpayPaymentAsync.pending, (state) => {
        state.paymentProcessing = true;
        state.error = null;
      })
      .addCase(verifyRazorpayPaymentAsync.fulfilled, (state) => {
        state.paymentProcessing = false;
      })
      .addCase(verifyRazorpayPaymentAsync.rejected, (state, action) => {
        state.paymentProcessing = false;
        state.error = action.payload as string;
      });
  },
});

export const { setPlans, setLoading, setError, clearError } = membershipSlice.actions;

export default membershipSlice.reducer;
