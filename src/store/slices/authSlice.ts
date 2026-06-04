import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { emailPasswordLogin, emailPasswordSignUp, getMatchingData, createDocument } from "@/Firebase";

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
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
      if (!authRes || typeof authRes === 'boolean' || authRes.error) {
        return rejectWithValue("Invalid credentials");
      }

      const users = await getMatchingData("users", "email", "==", credentials.email);
      const userDoc = users && users.length > 0 ? users[0] : null;

      const role = (userDoc?.role || "user").toLowerCase();
      
      return {
        user: { id: userDoc?.id || authRes.user?.uid || "", email: credentials.email, role, name: userDoc?.name },
        accessToken: "firebase-managed-token",
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
      if (authRes.error) {
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

      return {
        user: { id: authRes.uid, email: credentials.email, role: "user", name: credentials.name },
        accessToken: "firebase-managed-token",
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

export const { logout, setAuthUser, setAuthLoading } = authSlice.actions;
export default authSlice.reducer;
