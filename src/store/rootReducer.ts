import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import searchReducer from './slices/searchSlice';
import membershipReducer from './slices/membershipSlice';
import homeReducer from './slices/homeSlice';
import tvReducer from './slices/tvSlice';
import movieReducer from './slices/movieSlice';
import episodeReducer from './slices/episodeSlice';
import documentaryReducer from './slices/documentarySlice';

const rootReducer = combineReducers({
  auth: authReducer,
  search: searchReducer,
  membership: membershipReducer,
  home: homeReducer,
  tv: tvReducer,
  movie: movieReducer,
  episode: episodeReducer,
  documentary: documentaryReducer,
});

export default rootReducer;
