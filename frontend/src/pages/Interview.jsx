import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";

function Interview() {
  const [interviewId, setInterviewId] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [timeLeft, setTimeLeft] = useState(25 * 60); 

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const videoRef = useRef(null);

  const currentTextRef = useRef("");
  const charIndexRef = useRef(0);
  const speechRateRef = useRef(1.0);
  const voiceEnabledRef = useRef(true);
  const isCancelledInternallyRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const speechStartTimeRef = useRef(null);
  const hasBoundaryFiredRef = useRef(false);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied or error:", err);
      alert("Please allow camera access to continue the interview.");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

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
      setAnswer((prev) => (prev ? `${prev} ${response.data.text}` : response.data.text));
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Failed to transcribe the audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (started && !finished) {
      startWebcam();
    }
  }, [started, finished]);

    // ⏱️ 25-minute countdown timer with auto-finish
  useEffect(() => {
    if (!started || finished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndInterview("Time is up! Your interview has concluded.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, finished, interviewId]);

  // 🏁 End Interview Handler (called by Finish button or when timer hits 0)
  const handleEndInterview = async (customMessage) => {
    if (!interviewId || finished) return;

    try {
      setLoading(true);
      stopSpeaking();

      await api.post("/interview/end", { interview_id: interviewId });
      setFinished(true);
      stopWebcam();

      const closingSpeech = customMessage || "Interview concluded. Your full evaluation report is now available.";
      speakText(closingSpeech);
    } catch (err) {
      console.error("Error ending interview:", err);
      alert("Could not end interview.");
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first");
        return;
      }

      const response = await api.post("/interview/start", {
        user_id: user.id,
      });

      setInterviewId(response.data.interview_id);
      setQuestion(response.data.question);
      setQuestionNumber(response.data.question_number || 1);
      speakText(response.data.question);
      setStarted(true);
    } catch (error) {
      console.error(error);
      alert("Could not start interview");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;

    try {
      setLoading(true);
      const response = await api.post("/interview/answer", {
        interview_id: interviewId,
        answer: answer,
      });

      setFeedback(response.data.feedback);
      setAnswer("");

      if (response.data.finished) {
        setFinished(true);
        const fullspeech = `feedback: ${response.data.feedback}. Congratulations you have completed the interview`;
        speakText(fullspeech);
        stopWebcam();
      } else {
        setQuestion(response.data.question);
        if (response.data.question_number) {
          setQuestionNumber(response.data.question_number);
        } else {
          setQuestionNumber((prev) => prev + 1);
        }
        const fullspeech = `feedback: ${response.data.feedback}. Next question: ${response.data.question}`;
        speakText(fullspeech);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-slate-800">AI Interview Coach</h1>
        <p className="text-slate-600 mt-2">
          Practice technical interviews based on your resume.
        </p>

        {!started && (
          <button
            onClick={startInterview}
            className="mt-8 bg-cyan-500 text-white px-6 py-3 rounded-lg hover:bg-cyan-600 cursor-pointer"
          >
            {loading ? "Starting..." : "Start Interview"}
          </button>
        )}

        {started && !finished && (
          <div className="mt-8">
                          {/* 🎯 Status Bar: Adaptive Question Counter, Countdown Timer, & Finish Button */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 shadow-xs">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 bg-cyan-100 px-2.5 py-0.5 rounded-full">
                    Adaptive Interview Mode
                  </span>
                  <h3 className="text-xl font-bold text-slate-800 mt-1">
                    Question #{questionNumber}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* ⏱️ Countdown Timer Display */}
                  <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-semibold flex items-center gap-1.5 border ${
                    timeLeft < 300 
                      ? "bg-red-50 text-red-600 border-red-300 animate-pulse" 
                      : "bg-white text-slate-700 border-slate-200"
                  }`}>
                    <span>⏱️</span>
                    <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
                  </div>

                  {/* 🏁 Finish Button: Unlocked after at least 3 questions */}
                  <button
                    type="button"
                    onClick={() => handleEndInterview()}
                    disabled={questionNumber <= 3 || loading}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition shadow-xs ${
                      questionNumber > 3
                        ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    title={questionNumber <= 3 ? "Answer at least 3 questions to generate evaluation" : "Finish interview now"}
                  >
                    {questionNumber <= 3 
                      ? `Answer ${4 - questionNumber} more to finish` 
                      : "🏁 Finish & View Report"
                    }
                  </button>
                </div>
              </div>
            <div className="flex justify-center">
              <div className="relative rounded-xl overflow-hidden shadow-md border-2 border-slate-300 w-80 h-56 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  LIVE
                </div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-lg p-5 mt-6">
              <h2 className="font-semibold text-lg">Question</h2>
              <p className="mt-3 text-slate-700">{question}</p>

              {/* Smart AI Voice Toolbar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    disabled={!isSpeaking && !isPaused}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition ${
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
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition ${
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
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1 border transition cursor-pointer ${
                      voiceEnabled
                        ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                        : "border-red-300 bg-red-50 text-red-600 font-bold"
                    }`}
                    title={voiceEnabled ? "Mute audio" : "Unmute audio"}
                  >
                    {voiceEnabled ? "🔊 Mute" : "🔇 Unmute"}
                  </button>

                  <span className="text-xs font-medium text-slate-500 ml-1">
                    {!voiceEnabled
                      ? "🔇 Muted"
                      : isSpeaking
                      ? `🔊 Speaking (${speechRate}x)...`
                      : isPaused
                      ? "⏸️ Paused"
                      : "⚪ Ready"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium mr-1">Speed:</span>
                  {[1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeedOnTheFly(rate)}
                      className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
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

            <div className="flex items-center justify-between mt-6 mb-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading || isTranscribing}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition whitespace-nowrap cursor-pointer ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                    : "bg-slate-800 hover:bg-slate-900 text-white"
                }`}
              >
                {isRecording ? "⏹️ Stop Recording" : "🎙️ Speak Answer"}
              </button>

              {isTranscribing && (
                <span className="text-sm text-cyan-600 font-medium animate-pulse">
                  Transcribing your answer with Whisper...
                </span>
              )}
            </div>

            <textarea
              className="w-full mt-2 border rounded-lg p-4"
              rows="5"
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <button
              onClick={submitAnswer}
              className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 cursor-pointer"
            >
              {loading ? "Evaluating..." : "Submit Answer"}
            </button>
          </div>
        )}

        {feedback && (
          <div className="mt-8 bg-blue-50 border rounded-lg p-5">
            <h2 className="font-bold text-lg">Feedback</h2>
            <p className="mt-3 whitespace-pre-line">{feedback}</p>
          </div>
        )}

        {finished && (
          <div className="mt-8 bg-green-50 border rounded-lg p-5">
            <h2 className="text-xl font-bold text-green-700">Interview Completed 🎉</h2>
            <p className="mt-2">You have completed the interview.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Interview;
