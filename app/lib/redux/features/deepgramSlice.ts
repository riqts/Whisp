import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  createClient,
  LiveClient,
  LiveConnectionState,
  LiveSchema,
  LiveTranscriptionEvents,
} from "@deepgram/sdk";

interface DeepgramState {
  connection: LiveClient | null;
  connectionState: LiveConnectionState;
}

const initialState: DeepgramState = {
  connection: null,
  connectionState: LiveConnectionState.CLOSED,
};

export const connectToDeepgram = createAsyncThunk(
  "deepgram/connect",
  async (
    { options, endpoint }: { options: LiveSchema; endpoint?: string },
    { dispatch }
  ) => {
    const response = await fetch("/api/authenticate", { cache: "no-store" });
    const result = await response.json();
    const key = result.key;

    const deepgram = createClient(key);
    const conn = deepgram.listen.live(options, endpoint);

    conn.addListener("open", () => {
      dispatch(setConnectionState(LiveConnectionState.OPEN));
    });

    conn.addListener("close", () => {
      dispatch(setConnectionState(LiveConnectionState.CLOSED));
    });

    return conn;
  }
);

export const disconnectFromDeepgram = createAsyncThunk(
  "deepgram/disconnect",
  async (_, { getState }) => {
    const state = getState() as { deepgram: DeepgramState };
    if (state.deepgram.connection) {
      state.deepgram.connection.finish();
    }
  }
);

const deepgramSlice = createSlice({
  name: "deepgram",
  initialState,
  reducers: {
    setConnectionState: (state, action: PayloadAction<LiveConnectionState>) => {
      state.connectionState = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectToDeepgram.fulfilled, (state, action) => {
        state.connection = action.payload;
      })
      .addCase(disconnectFromDeepgram.fulfilled, (state) => {
        state.connection = null;
        state.connectionState = LiveConnectionState.CLOSED;
      });
  },
});

export const { setConnectionState } = deepgramSlice.actions;
export { LiveConnectionState, LiveTranscriptionEvents };
export default deepgramSlice.reducer;
