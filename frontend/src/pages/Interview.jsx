import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";
import { initFaceLandmarker, analyzeFrame } from "../services/proctoringService";

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
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25-minute countdown in seconds
  const [proctorStatus, setProctorStatus] = useState("OK"); // "OK", "WARNING", "VIOLATION"
  const [proctorWarning, setProctorWarning] = useState(null);
  const [violationCount, setViolationCount] = useState(0);

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
  const lastStrikeTimeRef = useRef(0);

  const isRecordingRef = useRef(false);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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
      if (isCancelledInternallyRef.current) return;
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
      if (response.data.text) {
        setAnswer((prev) => (prev ? `${prev} ${response.data.text}` : response.data.text));
      }
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

  // 🛡️ Real-Time AI Proctoring & Tab Switch Guard
    // 🛡️ Real-Time AI Proctoring & Tab Switch Guard
  useEffect(() => {
    if (!started || finished) return;

    let isSubscribed = true;
    let proctorInterval = null;

    // 1. Initialize Google MediaPipe (Clean, no audio lock)
    initFaceLandmarker().then(() => {
      if (!isSubscribed) return;

      proctorInterval = setInterval(() => {
        if (videoRef.current) {
          const analysis = analyzeFrame(videoRef.current, isRecordingRef.current);
          setProctorStatus(analysis.status);
          setProctorWarning(analysis.warning);

          // Cooldown debounce: only add 1 strike every 4 seconds for an ongoing warning
          if (analysis.status === "VIOLATION" || analysis.status === "WARNING") {
            const now = Date.now();
            if (now - lastStrikeTimeRef.current > 4000) {
              setViolationCount((prev) => prev + 1);
              lastStrikeTimeRef.current = now;
            }
          }
        }
      }, 600);
    });

    // 2. Detect Tab-Switching (Cheating via ChatGPT / Google)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setProctorStatus("VIOLATION");
        setProctorWarning("Tab switched! Please return to the interview.");
        setViolationCount((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isSubscribed = false;
      if (proctorInterval) clearInterval(proctorInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [started, finished]);

  // 🏁 End Interview Handler (sends telemetry & score to backend)
  const handleEndInterview = async (customMessage) => {
    
    if (!interviewId || finished) return;

    try {
      setLoading(true);
      stopSpeaking();

      const isTerminated = violationCount >= 5;
      const calculatedIntegrity = isTerminated
        ? 0
        : Math.max(0, 100 - violationCount * 10);

      await api.post("/interview/end", {
        interview_id: interviewId,
        violation_count: violationCount,
        integrity_score: calculatedIntegrity,
      });

      setFinished(true);
      stopWebcam();

      const closingSpeech =
        customMessage ||
        "Interview concluded. Your full evaluation report is now available.";
      speakText(closingSpeech);
    } catch (err) {
      console.error("Error ending interview:", err);
      alert("Could not end interview.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (started && !finished && violationCount >= 5) {
      handleEndInterview(
        "Interview terminated due to excessive proctoring violations. Your session has been flagged for review."
      );
    }
  }, [violationCount, started, finished]);

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
        const fullspeech = `Feedback: ${response.data.feedback}. Congratulations, you have completed the interview!`;
        handleEndInterview(fullspeech);
      } else {
        setQuestion(response.data.question);
        if (response.data.question_number) {
          setQuestionNumber(response.data.question_number);
        } else {
          setQuestionNumber((prev) => prev + 1);
        }
        const fullspeech = `Feedback: ${response.data.feedback}. Next question: ${response.data.question}`;
        speakText(fullspeech);
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong submitting answer");
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
            className="mt-8 bg-cyan-500 text-white px-6 py-3 rounded-lg hover:bg-cyan-600 cursor-pointer font-semibold shadow-xs transition"
          >
            {loading ? "Starting..." : "Start Interview"}
          </button>
        )}

        {started && !finished && (
          <div className="mt-8">
            {/* Status Bar */}
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
                {/* ⏱️ Countdown Timer */}
                <div
                  className={`px-3 py-1.5 rounded-lg font-mono text-sm font-semibold flex items-center gap-1.5 border ${
                    timeLeft < 300
                      ? "bg-red-50 text-red-600 border-red-300 animate-pulse"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  <span>⏱️</span>
                  <span>
                    {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {/* 🏁 Finish Button */}
                <button
                  type="button"
                  onClick={() => handleEndInterview()}
                  disabled={questionNumber <= 3 || loading}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition shadow-xs ${
                    questionNumber > 3
                      ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                  title={
                    questionNumber <= 3
                      ? "Answer at least 3 questions to generate evaluation"
                      : "Finish interview now"
                  }
                >
                  {questionNumber <= 3
                    ? `Answer ${4 - questionNumber} more to finish`
                    : "🏁 Finish & View Report"}
                </button>
              </div>
            </div>

            {/* Webcam & Proctoring Box */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-slate-300 w-80 h-56 bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Top-Left: Status Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    LIVE
                  </span>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shadow transition ${
                      proctorStatus === "OK"
                        ? "bg-emerald-600/90 text-white"
                        : proctorStatus === "WARNING"
                        ? "bg-amber-600/90 text-white animate-pulse"
                        : "bg-rose-600/90 text-white animate-pulse"
                    }`}
                  >
                    {proctorStatus === "OK"
  ? "🟢 Attentive"
  : proctorStatus === "WARNING"
  ? "🟡 Looking Away"
  : "🔴 Flagged"}
                  </span>
                </div>

                {/* Top-Right: Flags */}
                {violationCount > 0 && (
                  <div className="absolute top-2 right-2 bg-slate-900/85 backdrop-blur-xs text-rose-300 text-[10px] px-2 py-0.5 rounded-md font-semibold border border-rose-500/40">
                    Flags: {violationCount}
                  </div>
                )}

                {/* Bottom: Alert Banner */}
                {proctorWarning && (
                  <div className="absolute bottom-0 inset-x-0 bg-rose-700/90 backdrop-blur-xs text-white text-xs font-semibold py-1 px-3 text-center transition">
                    ⚠️ {proctorWarning}
                  </div>
                )}
              </div>
            </div>

            {/* Question Text & TTS Toolbar */}
            <div className="bg-slate-100 rounded-lg p-5">
              <h2 className="font-semibold text-lg">Question</h2>
              <p className="mt-3 text-slate-700 leading-relaxed">{question}</p>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-xs">
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

            {/* Answer Input Area */}
            <div className="flex items-center justify-between mt-6 mb-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading || isTranscribing}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition cursor-pointer ${
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
              className="w-full mt-2 border border-slate-300 rounded-lg p-4 focus:outline-cyan-500"
              rows="5"
              placeholder="Speak or type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <button
              onClick={submitAnswer}
              disabled={loading}
              className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold cursor-pointer shadow-xs transition"
            >
              {loading ? "Evaluating..." : "Submit Answer"}
            </button>
          </div>
        )}

        {feedback && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h2 className="font-bold text-lg text-blue-900">Feedback</h2>
            <p className="mt-3 whitespace-pre-line text-blue-800 leading-relaxed">
              {feedback}
            </p>
          </div>
        )}

                {finished && (
          <div
            className={`mt-8 rounded-xl p-6 text-center border ${
              violationCount >= 5
                ? "bg-rose-50 border-rose-300"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            <h2
              className={`text-2xl font-bold ${
                violationCount >= 5 ? "text-rose-800" : "text-emerald-800"
              }`}
            >
              {violationCount >= 5
                ? "🚨 Interview Terminated for Security Violations"
                : "🎉 Interview Completed!"}
            </h2>
            <p className="mt-2 text-slate-600">
              {violationCount >= 5
                ? "Session was automatically disqualified due to repeated proctoring violations. Integrity Score: 0%."
                : "Your answers and proctoring telemetry have been safely recorded."}
            </p>
            <a
              href="/history"
              className={`inline-block mt-4 px-6 py-2.5 font-semibold rounded-lg shadow-sm transition text-white ${
                violationCount >= 5
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {violationCount >= 5
                ? "View Incident Report in History →"
                : "View Detailed Evaluation & Proctoring Score →"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default Interview;
