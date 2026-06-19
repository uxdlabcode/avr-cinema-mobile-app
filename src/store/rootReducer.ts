import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import searchReducer from './slices/searchSlice';
import membershipReducer from './slices/membershipSlice';
import homeReducer from './slices/homeSlice';
import tvReducer from './slices/tvSlice';
import movieReducer from './slices/movieSlice';
import episodeReducer from './slices/episodeSlice';
import documentaryReducer from './slices/documentarySlice';
import trailerReducer from './slices/trailerSlice';
import quizReducer from './slices/quizSlice';
import mediaReducer from './slices/mediaSlice';
import notificationReducer from './slices/notificationSlice';
import genreReducer from './slices/genreSlice';
import watchProgressReducer from './slices/watchProgressSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  search: searchReducer,
  membership: membershipReducer,
  home: homeReducer,
  tv: tvReducer,
  movie: movieReducer,
  episode: episodeReducer,
  documentary: documentaryReducer,
  trailer: trailerReducer,
  quiz: quizReducer,
  media: mediaReducer,
  notifications: notificationReducer,
  genre: genreReducer,
  watchProgress: watchProgressReducer,
});

export default rootReducer;
