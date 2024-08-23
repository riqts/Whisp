import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export enum MicrophoneState {
  NotSetup = -1,
  SettingUp = 0,
  Ready = 1,
  Opening = 2,
  Open = 3,
  Error = 4,
  Pausing = 5,
  Paused = 6,
}

interface MicrophoneSliceState {
  microphone: MediaRecorder | null;
  microphoneState: MicrophoneState;
}

const initialState: MicrophoneSliceState = {
  microphone: null,
  microphoneState: MicrophoneState.NotSetup,
};

export const setupMicrophone = createAsyncThunk(
  "microphone/setup",
  async (_, { dispatch }) => {
    dispatch(setMicrophoneState(MicrophoneState.SettingUp));
    try {
      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });
      const microphone = new MediaRecorder(userMedia);
      dispatch(setMicrophoneState(MicrophoneState.Ready));
      return microphone;
    } catch (err: any) {
      console.error(err);
      dispatch(setMicrophoneState(MicrophoneState.Error));
      throw err;
    }
  }
);

export const startMicrophone = createAsyncThunk(
  "microphone/start",
  async (_, { getState, dispatch }) => {
    const state = getState() as { microphone: MicrophoneSliceState };
    dispatch(setMicrophoneState(MicrophoneState.Opening));
    if (state.microphone.microphone?.state === "paused") {
      state.microphone.microphone.resume();
    } else {
      state.microphone.microphone?.start(250);
    }
    dispatch(setMicrophoneState(MicrophoneState.Open));
  }
);

export const stopMicrophone = createAsyncThunk(
  "microphone/stop",
  async (_, { getState, dispatch }) => {
    const state = getState() as { microphone: MicrophoneSliceState };
    dispatch(setMicrophoneState(MicrophoneState.Pausing));
    if (state.microphone.microphone?.state === "recording") {
      state.microphone.microphone.pause();
      dispatch(setMicrophoneState(MicrophoneState.Paused));
    }
  }
);

const microphoneSlice = createSlice({
  name: "microphone",
  initialState,
  reducers: {
    setMicrophoneState: (state, action: PayloadAction<MicrophoneState>) => {
      state.microphoneState = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setupMicrophone.fulfilled, (state, action) => {
        state.microphone = action.payload;
      })
      .addCase(setupMicrophone.rejected, (state) => {
        state.microphoneState = MicrophoneState.Error;
      });
  },
});

export const { setMicrophoneState } = microphoneSlice.actions;
export default microphoneSlice.reducer;
