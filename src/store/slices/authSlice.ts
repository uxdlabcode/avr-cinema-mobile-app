import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { emailPasswordLogin, emailPasswordSignUp, getMatchingData, createDocument, getDocumentData } from "@/Firebase";

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  displayName?: string;
  phone?: string;
  avatar?: string;
  membershipPlanId?: string;
  membershipStatus?: string;
  membershipStartDate?: number;
  membershipExpiryDate?: number;
  lastPaymentId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const loginAsync = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const authRes = await emailPasswordLogin(credentials.email, credentials.password);
      if (!authRes || typeof authRes === 'boolean') {
        return rejectWithValue("Invalid credentials");
      }

      let userDoc = await getDocumentData("users", authRes.user.uid);
      if (!userDoc) {
        const users = await getMatchingData("users", "email", "==", credentials.email);
        userDoc = users && users.length > 0 ? users[0] : undefined;
      }

      const role = (userDoc?.role || "user").toLowerCase();
      
      // Get the actual JWT token
      const token = await authRes.user.getIdToken();

      return {
        user: { 
          id: userDoc?.id || authRes.user?.uid || "", 
          email: credentials.email, 
          role, 
          name: userDoc?.name,
          phone: userDoc?.phone,
          avatar: userDoc?.avatar
        },
        accessToken: token,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const signupAsync = createAsyncThunk(
  "auth/signup",
  async (credentials: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const authRes = await emailPasswordSignUp(credentials.name, credentials.email, credentials.password);
      if ('error' in authRes) {
        return rejectWithValue(authRes.message);
      }

      // Save user to Firestore 'users' collection
      const newUser = {
        name: credentials.name,
        email: credentials.email,
        role: "user",
        uid: authRes.uid
      };
      
      await createDocument("users", authRes.uid, newUser);
      
      // Import auth dynamically or just get it if it's available, 
      // but emailPasswordSignUp doesn't return the full user credential.
      // So let's get the token directly from the auth instance.
      const { auth } = await import("@/Firebase/firebase");
      let token = "firebase-managed-token";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      return {
        user: { 
          id: authRes.uid, 
          email: credentials.email, 
          role: "user", 
          name: credentials.name,
          phone: "",
          avatar: ""
        },
        accessToken: token,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Signup failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    setAuthUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    updateAuthUser(state, action: PayloadAction<{ name?: string; phone?: string; avatar?: string }>) {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      }
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loginAsync.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginAsync.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
    });
    builder.addCase(loginAsync.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });

    builder.addCase(signupAsync.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(signupAsync.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
    });
    builder.addCase(signupAsync.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });
  },
});

export const { logout, setAuthUser, setAuthLoading, updateAuthUser } = authSlice.actions;
export default authSlice.reducer;
