import { useState } from "react";
import { useRef } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";
function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: "coach",
      text: "Hi! I've analyzed your resume. Ask me anything about your experience, projects, or interview preparation.",
    },
  ]);
  const [isRecording, setIsRecording]= useState(false);
  
    const [isTranscribing, setIsTranscribing]= useState(false);
  
    const mediaRecorderRef= useRef(null);
    
    const audioChunksRef= useRef([]);

  const [question, setQuestion] = useState("");
  const speakText = (text) => {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  utterance.rate = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(
    (voice) => voice.lang.includes("en-US") || voice.lang.includes("en-GB")
  );
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  utterance.onstart = () => console.log("AI is speaking...");
  utterance.onend = () => console.log("AI finished speaking.");
  utterance.onerror = (e) => console.error("Speech error:", e);

  window.speechSynthesis.speak(utterance); 
};

  const startRecording= async ()=> {
    try{
      const stream= await navigator.mediaDevices.getUserMedia({audio: true});
      const mediaRecorder= new MediaRecorder(stream);
      mediaRecorderRef.current= mediaRecorder;
      audioChunksRef.current= [];
      mediaRecorder.ondataavailable= (event)=>{
        if(event.data.size>0){
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop= async ()=> {
        const audioBlob= new Blob(audioChunksRef.current, {type: "audio/webm"});
        stream.getTracks().forEach((track)=>track.stop());
        await handleTranscription(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    }
    catch(err){
      console.error("Microphone access error", err);
      alert("please allow microphone access to record your answer");
    }
  };

  const stopRecording=()=>{
    if(mediaRecorderRef.current && isRecording){
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  const handleTranscription= async(audioBlob)=>{
    try{
      setIsTranscribing(true);
      const formData= new FormData();
      formData.append("file", audioBlob, "recording.webm");
      const response= await api.post(
        "/transcribe",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
        }
      );
      setQuestion((prev)=>(prev? `${prev} ${response.data.text}`: response.data.text));
    }
    catch(err){
      console.error("Transcription error:", err);
      alert("Failed to transcribe the audio.");
    }
    finally{
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
        <div className="border-b p-6">
          <h1 className="text-3xl font-bold text-slate-800">
            Coach AI
          </h1>

          <p className="text-slate-600 mt-2">
            Chat with your AI interview coach.
          </p>
        </div>

        {/* Chat Area */}
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
              {message.text}
            </div>
          ))}

        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3">
          <div className="flex items-center justify-between mt-6 mb-2">
  <button
    type="button"
    onClick={isRecording ? stopRecording : startRecording}
    disabled={isTranscribing}
    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition ${
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
          <input
            type="text"
            placeholder="Ask something about your resume..."
            className="flex-1 border rounded-lg px-4 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button
            onClick={handleSend}
            className="bg-cyan-500 text-white px-6 rounded-lg hover:bg-cyan-600"
          >
            Send
          </button>

        </div>

      </div>
    </div>
  );
}

export default Chat;