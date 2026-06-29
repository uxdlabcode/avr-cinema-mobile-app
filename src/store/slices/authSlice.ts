import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { emailPasswordLogin, emailPasswordSignUp, getMatchingData, createDocument, getDocumentData } from "@/Firebase";
import {
  getDeviceId,
  getBrowserInfo,
  buildLocationInfo,
  saveDevice,
  createDeviceDocument,
} from "@/lib/deviceManager";

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  displayName?: string;
  phone?: string;
  age?: number | null;
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
  // When login is blocked, hold the existing device list for the UI
  blockedDevices: import("@/lib/deviceManager").DeviceEntry[] | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  blockedDevices: null,
};

// ─── Login Thunk ─────────────────────────────────────────────────────────────
export const loginAsync = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // 1. Firebase Auth sign-in
      const authRes = await emailPasswordLogin(credentials.email, credentials.password);
      if (!authRes || typeof authRes === "boolean") {
        return rejectWithValue("Invalid credentials");
      }

      const uid = authRes.user.uid;

      // ─── Token Propagation Delay ───
      // Give the Firebase Auth state changes 500ms to propagate to the Firestore SDK
      // before executing the saveDevice transaction (prevents permission denied race condition)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Device info + location (parallel)
      const [browserInfo, locationInfo] = await Promise.all([
        Promise.resolve(getBrowserInfo()),
        buildLocationInfo(),
      ]);
      const deviceId = getDeviceId();

      // 3. Device limit check + registration
      const deviceResult = await saveDevice(uid, credentials.email, {
        deviceId,
        deviceName: browserInfo.deviceName,
        browser: browserInfo.browser,
        platform: browserInfo.platform,
        os: browserInfo.os,
        ip: locationInfo.ip,
        city: locationInfo.city,
        country: locationInfo.country,
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
      });

      if (!deviceResult.allowed) {
        // Sign out the user immediately — device limit reached
        const { auth } = await import("@/Firebase/firebase");
        await auth.signOut();
        return rejectWithValue({
          type: "DEVICE_LIMIT",
          uid,
          message:
            "Maximum device limit reached. Please logout from another device before signing in.",
          devices: deviceResult.devices || [],
        });
      }

      // 4. Mark session active
      sessionStorage.setItem("device_session_active", "true");
      sessionStorage.setItem("avr_session_device_id", deviceId);

      // 5. Fetch Firestore user doc
      let userDoc = await getDocumentData("users", uid);
      if (!userDoc) {
        const users = await getMatchingData("users", "email", "==", credentials.email);
        userDoc = users && users.length > 0 ? users[0] : undefined;
      }

      const role = (userDoc?.role || "user").toLowerCase();
      const token = await authRes.user.getIdToken();

      return {
        user: {
          id: userDoc?.id || uid,
          email: credentials.email,
          role,
          name: userDoc?.name,
          phone: userDoc?.phone,
          age: userDoc?.age ?? null,
          avatar: userDoc?.avatar,
          membershipPlanId: userDoc?.membershipPlanId,
          membershipStatus: userDoc?.membershipStatus,
          membershipStartDate: userDoc?.membershipStartDate?.seconds
            ? userDoc.membershipStartDate.seconds * 1000
            : userDoc?.membershipStartDate instanceof Date
            ? userDoc.membershipStartDate.getTime()
            : Number(userDoc?.membershipStartDate) || undefined,
          membershipExpiryDate: userDoc?.membershipExpiryDate?.seconds
            ? userDoc.membershipExpiryDate.seconds * 1000
            : userDoc?.membershipExpiryDate instanceof Date
            ? userDoc.membershipExpiryDate.getTime()
            : Number(userDoc?.membershipExpiryDate) || undefined,
          lastPaymentId: userDoc?.lastPaymentId,
        },
        accessToken: token,
      };
    } catch (error: any) {
      // Pass through structured errors (DEVICE_LIMIT)
      if (error?.type === "DEVICE_LIMIT") return rejectWithValue(error);
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

// ─── Signup Thunk ─────────────────────────────────────────────────────────────
export const signupAsync = createAsyncThunk(
  "auth/signup",
  async (
    credentials: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      age?: number | null;
    },
    { rejectWithValue }
  ) => {
    try {
      // 1. Create Firebase Auth account
      const authRes = await emailPasswordSignUp(
        credentials.name,
        credentials.email,
        credentials.password
      );
      if ("error" in authRes) {
        return rejectWithValue(authRes.message);
      }

      const uid = authRes.uid;

      // 2. Save user to Firestore 'users' collection
      const newUser: Record<string, any> = {
        name: credentials.name,
        email: credentials.email,
        role: "user",
        uid,
        phone: credentials.phone || "",
      };
      if (credentials.age !== undefined && credentials.age !== null) {
        newUser.age = credentials.age;
      }
      await createDocument("users", uid, newUser);

      // 3. Device info + location (parallel) — non-blocking for UX
      const [browserInfo, locationInfo] = await Promise.all([
        Promise.resolve(getBrowserInfo()),
        buildLocationInfo(),
      ]);
      const deviceId = getDeviceId();

      // 4. Create deviceLocations document with first device
      await createDeviceDocument(uid, credentials.email, {
        deviceId,
        deviceName: browserInfo.deviceName,
        browser: browserInfo.browser,
        platform: browserInfo.platform,
        os: browserInfo.os,
        ip: locationInfo.ip,
        city: locationInfo.city,
        country: locationInfo.country,
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
      });

      // 5. Mark session active
      sessionStorage.setItem("device_session_active", "true");
      sessionStorage.setItem("avr_session_device_id", deviceId);

      // 6. Get token
      const { auth } = await import("@/Firebase/firebase");
      let token = "firebase-managed-token";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      return {
        user: {
          id: uid,
          email: credentials.email,
          role: "user",
          name: credentials.name,
          phone: credentials.phone || "",
          age: credentials.age ?? null,
          avatar: "",
        },
        accessToken: token,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Signup failed");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.blockedDevices = null;
    },
    setAuthUser(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
      state.blockedDevices = null;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    updateAuthUser(
      state,
      action: PayloadAction<{ name?: string; phone?: string; age?: number | null; avatar?: string }>
    ) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearBlockedDevices(state) {
      state.blockedDevices = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── Login ──
    builder.addCase(loginAsync.pending, (state) => {
      state.loading = true;
      state.error = null;
      state.blockedDevices = null;
    });
    builder.addCase(loginAsync.fulfilled, (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.blockedDevices = null;
    });
    builder.addCase(loginAsync.rejected, (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      const payload = action.payload as any;
      if (payload?.type === "DEVICE_LIMIT") {
        state.error = payload.message;
        state.blockedDevices = payload.devices;
      } else {
        state.error = (payload as string) || "Login failed";
        state.blockedDevices = null;
      }
    });

    // ── Signup ──
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

export const { logout, setAuthUser, setAuthLoading, updateAuthUser, clearBlockedDevices } =
  authSlice.actions;
export default authSlice.reducer;
