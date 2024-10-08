"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "../lib/redux/hooks";
import {
  connectToDeepgram,
  LiveConnectionState,
  LiveTranscriptionEvents,
} from "../lib/redux/features/deepgramSlice";
import {
  setupMicrophone,
  startMicrophone,
  stopMicrophone,
  MicrophoneState,
} from "../lib/redux/features/microphoneSlice";
import Visualizer from "./Visualizer";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const [caption, setCaption] = useState<string | undefined>(
    "Powered by Deepgram"
  );
  const connection = useAppSelector((state) => state.deepgram.connection);
  const connectionState = useAppSelector(
    (state) => state.deepgram.connectionState
  );
  const microphone = useAppSelector((state) => state.microphone.microphone);
  const microphoneState = useAppSelector(
    (state) => state.microphone.microphoneState
  );

  const captionTimeout = useRef<NodeJS.Timeout>();
  const keepAliveInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    dispatch(setupMicrophone());
  }, [dispatch]);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Open) {
      dispatch(
        connectToDeepgram({
          options: {
            model: "nova-2",
            interim_results: true,
            smart_format: true,
            filler_words: true,
            utterance_end_ms: 3000,
          },
        })
      );
    }
  }, [dispatch, microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;
    if (microphoneState !== MicrophoneState.Open) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection.send(e.data);
      }
    };

    const onTranscript = (data: any) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      console.log("thisCaption", thisCaption);
      if (thisCaption !== "") {
        console.log('thisCaption !== ""', thisCaption);
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener("dataavailable", onData);
    }

    return () => {
      connection.removeListener(
        LiveTranscriptionEvents.Transcript,
        onTranscript
      );
      microphone.removeEventListener("dataavailable", onData);
      clearTimeout(captionTimeout.current);
    };
  }, [connectionState, connection, microphone, microphoneState]);

  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
  }, [microphoneState, connectionState, connection]);

  const toggleRecording = () => {
    if (microphoneState === MicrophoneState.Open) {
      dispatch(stopMicrophone());
    } else if (
      microphoneState === MicrophoneState.Ready ||
      microphoneState === MicrophoneState.Paused
    ) {
      dispatch(startMicrophone());
    }
  };

  return (
    <>
      <div className="flex h-full antialiased">
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            <div className="relative w-full h-full">
              {microphone && <Visualizer microphone={microphone} />}
              <div className="absolute bottom-[8rem] inset-x-0 max-w-4xl mx-auto text-center">
                {caption && <span className="bg-black/70 p-8">{caption}</span>}
              </div>
              <button
                onClick={toggleRecording}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full z-10"
                disabled={
                  microphoneState === MicrophoneState.SettingUp ||
                  microphoneState === MicrophoneState.Opening ||
                  microphoneState === MicrophoneState.Pausing
                }
              >
                {microphoneState === MicrophoneState.Open ? "Pause" : "Record"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
