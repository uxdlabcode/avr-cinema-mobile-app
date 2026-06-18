import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: "media_upload" | "membership" | "quiz";
  image: string;
  read: boolean;
  createdAt: number;
  link?: string;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  status: "idle",
  error: null,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
      state.status = "succeeded";
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      if (action.payload) {
        state.status = "loading";
      } else if (state.status === "loading") {
        state.status = "idle";
      }
    },
    setError(state, action: PayloadAction<string | null>) {
      state.status = "failed";
      state.error = action.payload;
    },
    resetNotifications(state) {
      state.items = [];
      state.unreadCount = 0;
      state.status = "idle";
      state.error = null;
    },
    toggleLocalRead(state, action: PayloadAction<string>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item) {
        item.read = !item.read;
        state.unreadCount = state.items.filter((n) => !n.read).length;
      }
    },
    markAllLocalRead(state) {
      state.items.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
  },
});

export const {
  setNotifications,
  setLoading,
  setError,
  resetNotifications,
  toggleLocalRead,
  markAllLocalRead,
} = notificationSlice.actions;

export default notificationSlice.reducer;
