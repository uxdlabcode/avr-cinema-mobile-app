import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCollectionData } from "@/Firebase";

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctAnswers: string[];
  points?: number;
  type?: "single" | "multiselect";
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  questions: QuizQuestion[];
  createdAt: string;
}

interface QuizState {
  items: Quiz[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: QuizState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchQuizzes = createAsyncThunk("quiz/fetchQuizzes", async () => {
  const data = await getCollectionData("quizzes");
  return data as unknown as Quiz[];
});

const quizSlice = createSlice({
  name: "quiz",
  initialState,
  reducers: {
    resetQuizStatus(state) {
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuizzes.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchQuizzes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "Failed to load quizzes";
      });
  },
});

export const { resetQuizStatus } = quizSlice.actions;
export default quizSlice.reducer;
