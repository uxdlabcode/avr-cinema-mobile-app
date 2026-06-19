import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData, getSignedUrl } from "@/Firebase";

interface MediaItem {
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

interface MediaState {
  items: MediaItem[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: MediaState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchAllMedia = createAsyncThunk(
  "media/fetchAllMedia",
  async () => {
    const docs = await getCollectionData("media", 100);

    const enriched = await Promise.all(
      docs.map(async (doc: any) => {
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
          image: image,
          signedThumbnailUrl: image,
          category: doc.category || "Movie",
          releaseYear: doc.releaseYear || doc.year || "2026",
          ageRating: doc.ageRating || doc.rating || "U/A 13+",
          language: doc.language || "Hindi",
          duration: doc.duration || "N/A",
        };
      })
    );

    // Sort by createdAt descending
    return enriched.sort((a: any, b: any) => {
      const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }
);

const mediaSlice = createSlice({
  name: "media",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllMedia.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchAllMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchAllMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load media";
      });
  },
});

export default mediaSlice.reducer;
