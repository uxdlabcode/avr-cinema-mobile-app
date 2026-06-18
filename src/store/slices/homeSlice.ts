import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData, getSignedUrl } from "@/Firebase";

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  signedThumbnailUrl?: string;
  image?: string;
  genres?: string[];
  duration?: string;
  releaseYear?: number;
  category?: string;
  featured?: boolean;
  ageRating?: string;
  language?: string;
  publisher?: string;
  contentDescriptor?: string;
  seasons?: any[];
  cast?: any[];
  [key: string]: any;
}

interface HomeState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: HomeState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchHomeMedia = createAsyncThunk(
  "home/fetchHomeMedia",
  async () => {
    const docs = await getCollectionData("media");

    const enriched = await Promise.all(
      (docs || []).map(async (doc: any) => {
        let image = "/assets/poster.png";
        if (doc.thumbnailUrl) {
          try {
            image = await getSignedUrl(doc.thumbnailUrl);
          } catch {
            image = doc.thumbnailUrl;
          }
        }
        return {
          ...doc,
          id: doc.id,
          image,
          signedThumbnailUrl: image,
          category: doc.category || "Movie",
          releaseYear: doc.releaseYear || doc.year || 2026,
          ageRating: doc.ageRating || doc.rating || "U/A 13+",
          language: doc.language || "Hindi",
          duration: doc.duration || "N/A",
        };
      })
    );

    return enriched.sort((a: any, b: any) => {
      const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }
);

const homeSlice = createSlice({
  name: "home",
  initialState,
  reducers: {
    resetHomeStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchHomeMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchHomeMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load home media";
      });
  },
});

export const { resetHomeStatus } = homeSlice.actions;
export default homeSlice.reducer;
