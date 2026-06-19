import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collection, query, where, limit, startAfter, getDocs } from "firebase/firestore";
import { db } from "@/Firebase/firebase";
import { getSignedUrl } from "@/Firebase";
import { filterByUserAge } from "@/lib/ageFilter";
import type { MediaItem } from "./homeSlice";

interface GenreState {
  items: MediaItem[];
  status: "idle" | "loading" | "loadingMore" | "succeeded" | "failed";
  error: string | null;
  lastDocId: string | null;
  hasMore: boolean;
  currentGenreName: string | null;
}

const initialState: GenreState = {
  items: [],
  status: "idle",
  error: null,
  lastDocId: null,
  hasMore: true,
  currentGenreName: null,
};

// Module-level cache for Firestore document snapshots (non-serializable)
const documentSnapshotCache = new Map<string, any>();

interface FetchGenreParams {
  genreName: string;
  limitVal: number;
  userAge: number | null;
}

export const fetchGenreMedia = createAsyncThunk(
  "genre/fetchGenreMedia",
  async ({ genreName, limitVal, userAge }: FetchGenreParams, thunkAPI) => {
    const state = thunkAPI.getState() as any;
    const { lastDocId, currentGenreName } = state.genre;

    // Detect if we changed the genre name or if this is the first page load
    const isFirstPage = currentGenreName !== genreName || lastDocId === null;

    const normalizedGenre = genreName.toLowerCase();
    const isCategoryQuery = ["tv show", "tv shows", "documentary", "documentaries", "trailer", "trailers"].includes(normalizedGenre);

    let queryField = "genres";
    let queryOperator: any = "array-contains";
    let queryVal: any = genreName;

    if (isCategoryQuery) {
      queryField = "category";
      queryOperator = "==";
      if (normalizedGenre.startsWith("tv")) {
        queryVal = "TV Show";
      } else if (normalizedGenre.startsWith("doc")) {
        queryVal = "Documentary";
      } else if (normalizedGenre.startsWith("trail")) {
        queryVal = "Trailer";
      }
    }

    let q;
    if (isFirstPage) {
      q = query(
        collection(db, "media"),
        where(queryField, queryOperator, queryVal),
        limit(limitVal)
      );
    } else {
      const lastDocSnapshot = documentSnapshotCache.get(lastDocId || "");
      if (lastDocSnapshot) {
        q = query(
          collection(db, "media"),
          where(queryField, queryOperator, queryVal),
          startAfter(lastDocSnapshot),
          limit(limitVal)
        );
      } else {
        // Fallback if cache is cleared
        q = query(
          collection(db, "media"),
          where(queryField, queryOperator, queryVal),
          limit(limitVal)
        );
      }
    }

    const querySnapshot = await getDocs(q);
    const fetchedItems: any[] = [];

    querySnapshot.forEach((doc) => {
      documentSnapshotCache.set(doc.id, doc);
      fetchedItems.push({ id: doc.id, ...doc.data() });
    });

    // Cloudinary URL signing
    const signedItems = await Promise.all(
      fetchedItems.map(async (item) => {
        let signedThumb = item.thumbnailUrl || "";
        if (signedThumb) {
          try {
            signedThumb = await getSignedUrl(item.thumbnailUrl);
          } catch (err) {
            console.error("Error signing URL:", err);
          }
        }
        return {
          ...item,
          signedThumbnailUrl: signedThumb,
        } as MediaItem;
      })
    );

    // Apply age filter
    const filtered = filterByUserAge(signedItems, userAge);

    const docs = querySnapshot.docs;
    const newLastDocId = docs.length > 0 ? docs[docs.length - 1].id : null;
    const hasMore = docs.length === limitVal;

    return {
      items: filtered,
      lastDocId: newLastDocId,
      hasMore,
      genreName,
      isFirstPage,
    };
  }
);

const genreSlice = createSlice({
  name: "genre",
  initialState,
  reducers: {
    resetGenreState(state) {
      state.items = [];
      state.status = "idle";
      state.error = null;
      state.lastDocId = null;
      state.hasMore = true;
      state.currentGenreName = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGenreMedia.pending, (state, action) => {
        const { genreName } = action.meta.arg;
        if (state.currentGenreName !== genreName || state.lastDocId === null) {
          state.status = "loading";
          state.items = [];
          state.lastDocId = null;
          state.hasMore = true;
        } else {
          state.status = "loadingMore";
        }
        state.currentGenreName = genreName;
      })
      .addCase(fetchGenreMedia.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { items, lastDocId, hasMore, isFirstPage } = action.payload;

        if (isFirstPage) {
          state.items = items;
        } else {
          // Avoid duplicate entries
          const existingIds = new Set(state.items.map((i) => i.id));
          const uniqueNewItems = items.filter((item) => !existingIds.has(item.id));
          state.items = [...state.items, ...uniqueNewItems];
        }

        state.lastDocId = lastDocId;
        state.hasMore = hasMore;
      })
      .addCase(fetchGenreMedia.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to fetch genre media";
      });
  },
});

export const { resetGenreState } = genreSlice.actions;
export default genreSlice.reducer;
