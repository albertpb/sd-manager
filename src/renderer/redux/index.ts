import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { globalSlice } from './reducers/global';

export const store = configureStore({
  reducer: {
    global: globalSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export type LoadState = 'idle' | 'pending' | 'succeeded' | 'failed';
