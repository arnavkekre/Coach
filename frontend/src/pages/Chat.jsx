import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";

function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: "coach",
      text: "Hi! I've analyzed your resume. Ask me anything about your experience, projects, or interview preparation.",
    },
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [question, setQuestion] = useState("");

  const currentTextRef = useRef("");
  const charIndexRef = useRef(0);
  const speechRateRef = useRef(1.0);
  const voiceEnabledRef = useRef(true);
  const isCancelledInternallyRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const speechStartTimeRef = useRef(null);
  const hasBoundaryFiredRef = useRef(false);

  const getPreferredVoice = () => {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const localVoice = voices.find(
      (v) =>
        (v.localService || !v.name.toLowerCase().includes("google")) &&
        (v.lang.includes("en-US") || v.lang.includes("en-GB") || v.lang.startsWith("en"))
    );
    if (localVoice) return localVoice;

    const anyVoice = voices.find(
      (v) => v.lang.includes("en-US") || v.lang.includes("en-GB") || v.lang.startsWith("en")
    );
    return anyVoice || voices[0] || null;
  };

  const getCurrentCharIndex = () => {
    if (hasBoundaryFiredRef.current) {
      return charIndexRef.current;
    }
    if (speechStartTimeRef.current && currentTextRef.current) {
      const elapsed = (Date.now() - speechStartTimeRef.current) / 1000;
      const rate = speechRateRef.current || 1.0;
      const charsSpoken = Math.floor(elapsed * 16 * rate);
      const estimated = Math.min(
        currentTextRef.current.length,
        charIndexRef.current + charsSpoken
      );
      const nextSpace = currentTextRef.current.indexOf(" ", estimated);
      if (nextSpace !== -1 && nextSpace - estimated < 10) {
        return nextSpace + 1;
      }
      return estimated;
    }
    return charIndexRef.current;
  };

  const speakText = (text, startChar = 0, targetRate = speechRateRef.current) => {
    if (!("speechSynthesis" in window) || !text) return;

    currentTextRef.current = text;
    const safeStart = Math.max(0, Math.min(startChar, text.length));
    charIndexRef.current = safeStart;

    const textToSpeak = text.slice(safeStart);
    if (!textToSpeak.trim()) {
      setIsSpeaking(false);
      setIsPaused(false);
      currentTextRef.current = "";
      charIndexRef.current = 0;
      return;
    }

    if (!voiceEnabledRef.current) {
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }

    isCancelledInternallyRef.current = true;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.rate = targetRate;

    const preferredVoice = getPreferredVoice();
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    activeUtteranceRef.current = utterance;
    window._activeUtterance = utterance;
    speechStartTimeRef.current = Date.now();
    hasBoundaryFiredRef.current = false;

    utterance.onboundary = (event) => {
      if (typeof event.charIndex === "number") {
        charIndexRef.current = safeStart + event.charIndex;
        hasBoundaryFiredRef.current = true;
      }
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      isCancelledInternallyRef.current = false;
    };

    utterance.onend = () => {
      if (isCancelledInternallyRef.current) {
        return;
      }
      setIsSpeaking(false);
      setIsPaused(false);
      currentTextRef.current = "";
      charIndexRef.current = 0;
      activeUtteranceRef.current = null;
      window._activeUtterance = null;
    };

    utterance.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled" || isCancelledInternallyRef.current) {
        return;
      }
      console.error("Speech error:", e);
      setIsSpeaking(false);
      setIsPaused(false);
      activeUtteranceRef.current = null;
      window._activeUtterance = null;
    };

    setTimeout(() => {
      if (voiceEnabledRef.current) {
        window.speechSynthesis.speak(utterance);
      }
    }, 25);
  };

  const changeSpeedOnTheFly = (newRate) => {
    setSpeechRate(newRate);
    speechRateRef.current = newRate;

    if (isSpeaking && currentTextRef.current) {
      const currentChar = getCurrentCharIndex();
      charIndexRef.current = currentChar;
      isCancelledInternallyRef.current = true;
      window.speechSynthesis.cancel();
      speakText(currentTextRef.current, currentChar, newRate);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      isCancelledInternallyRef.current = false;
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    currentTextRef.current = "";
    charIndexRef.current = 0;
    activeUtteranceRef.current = null;
    window._activeUtterance = null;
  };

  const togglePauseResume = () => {
    if (!("speechSynthesis" in window)) return;

    if (isSpeaking) {
      const currentChar = getCurrentCharIndex();
      charIndexRef.current = currentChar;
      isCancelledInternallyRef.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(true);
    } else if (isPaused && currentTextRef.current) {
      setIsPaused(false);
      speakText(currentTextRef.current, charIndexRef.current, speechRateRef.current);
    }
  };

  const toggleMute = () => {
    if (voiceEnabled) {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
      if (isSpeaking) {
        const currentChar = getCurrentCharIndex();
        charIndexRef.current = currentChar;
        isCancelledInternallyRef.current = true;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(true);
      }
    } else {
      voiceEnabledRef.current = true;
      setVoiceEnabled(true);
      if (currentTextRef.current) {
        setIsPaused(false);
        speakText(currentTextRef.current, charIndexRef.current, speechRateRef.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await handleTranscription(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error", err);
      alert("Please allow microphone access to record your answer.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (audioBlob) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      const response = await api.post("/transcribe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setQuestion((prev) => (prev ? `${prev} ${response.data.text}` : response.data.text));
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Failed to transcribe the audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMessage = question;
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userMessage,
      },
    ]);
    setQuestion("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        return;
      }

      const response = await api.post("/chat", {
        user_id: user.id,
        question: userMessage,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: response.data.answer,
        },
      ]);
      speakText(response.data.answer);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: "Sorry, something went wrong.",
        },
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-10">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg flex flex-col">
        {/* Header */}
        <div className="border-b p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Coach AI</h1>
            <p className="text-slate-600 mt-1">Chat with your AI interview coach.</p>
          </div>

          {/* Smart AI Voice & Speed Toolbar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shadow-xs">
            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!isSpeaking && !isPaused}
              className={`text-xs font-bold px-2 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition ${
                isSpeaking || isPaused
                  ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              title="Stop speaking permanently"
            >
              ⏹️ Stop
            </button>

            <button
              type="button"
              onClick={togglePauseResume}
              disabled={!isSpeaking && !isPaused}
              className={`text-xs font-bold px-2 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition ${
                isSpeaking || isPaused
                  ? "bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              title={isPaused ? "Resume speaking" : "Pause audio"}
            >
              {isPaused ? "▶️ Resume" : "⏸️ Pause"}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className={`text-xs font-semibold px-2 py-1.5 rounded-md flex items-center gap-1 border transition cursor-pointer ${
                voiceEnabled
                  ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "border-red-300 bg-red-50 text-red-600 font-bold"
              }`}
              title={voiceEnabled ? "Mute audio" : "Unmute audio"}
            >
              {voiceEnabled ? "🔊 Mute" : "🔇 Unmute"}
            </button>

            <span className="text-xs font-medium text-slate-500 mx-1">
              {!voiceEnabled
                ? "🔇 Muted"
                : isSpeaking
                ? `🔊 Speaking (${speechRate}x)...`
                : isPaused
                ? "⏸️ Paused"
                : "⚪ Ready"}
            </span>

            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <span className="text-slate-500 font-medium text-xs">Speed:</span>
              {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => changeSpeedOnTheFly(rate)}
                  className={`text-xs px-2 py-1 rounded font-semibold transition cursor-pointer ${
                    speechRate === rate
                      ? "bg-cyan-500 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto h-125">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[75%] rounded-xl px-4 py-3 ${
                message.sender === "user"
                  ? "ml-auto bg-cyan-500 text-white"
                  : "bg-slate-200 text-slate-900"
              }`}
            >
              <p>{message.text}</p>
              {message.sender === "coach" && (
                <div className="mt-2 flex items-center gap-2 pt-1 border-t border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => speakText(message.text, 0, speechRate)}
                    className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium transition cursor-pointer"
                    title="Listen to this message"
                  >
                    🔊 Listen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t p-4 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition whitespace-nowrap ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-slate-800 hover:bg-slate-900 text-white"
            }`}
          >
            {isRecording ? "⏹️ Stop Recording" : "🎙️ Speak Answer"}
          </button>

          {isTranscribing && (
            <span className="text-sm text-cyan-600 font-medium animate-pulse whitespace-nowrap">
              Transcribing with Whisper...
            </span>
          )}

          <input
            type="text"
            placeholder="Ask something about your resume..."
            className="flex-1 border rounded-lg px-4 py-2 w-full"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <button
            onClick={handleSend}
            className="bg-cyan-500 text-white px-6 py-2 rounded-lg hover:bg-cyan-600 cursor-pointer"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
