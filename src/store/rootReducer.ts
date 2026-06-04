import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import searchReducer from './slices/searchSlice';
import membershipReducer from './slices/membershipSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  search: searchReducer,
  membership: membershipReducer,
  // add other reducers here later
});

export default rootReducer;
