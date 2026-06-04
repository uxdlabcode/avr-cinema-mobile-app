import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import searchReducer from './slices/searchSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  search: searchReducer,
  // add other reducers here later
});

export default rootReducer;
