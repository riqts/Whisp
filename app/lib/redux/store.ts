import { configureStore } from "@reduxjs/toolkit";
import deepgramReducer from "./features/deepgramSlice";
import microphoneReducer from "./features/microphoneSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      deepgram: deepgramReducer,
      microphone: microphoneReducer,
    },
  });

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
