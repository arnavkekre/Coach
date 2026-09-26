import { useState } from "react";
import { useRef } from "react";
import { useEffect } from "react";
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

  const [isRecording, setIsRecording]= useState(false);

  const [isTranscribing, setIsTranscribing]= useState(false);

  const mediaRecorderRef= useRef(null);
  
  const audioChunksRef= useRef([]);

  const videoRef= useRef(null);
  
  const startWebcam= async()=>{
    try{
      const stream= await navigator.mediaDevices.getUserMedia({
        video: {width: 640, height: 480},
        audio: false
      });
      if(videoRef.current){
        videoRef.current.srcObject= stream;
      }
    }
    catch(err){
      console.error("Camera access denied or error:", err);
      alert("Please allow camera access to continue the interview.");
    }
  }

  const stopWebcam = () => {
  if (videoRef.current && videoRef.current.srcObject) {
    const stream = videoRef.current.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.stop()); 
    videoRef.current.srcObject = null;
  }
};

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

 useEffect(() => {
  if (started && !finished) {
    startWebcam();
  }
}, [started, finished]);

  const startInterview = async () => {

    try {

      setLoading(true);


      const {
        data: { user }
      } = await supabase.auth.getUser();


      if (!user) {
        alert("Please login first");
        return;
      }


      const response = await api.post(
        "/interview/start",
        {
          user_id: user.id
        }
      );


      setInterviewId(
        response.data.interview_id
      );


      setQuestion(
        response.data.question
      );
      speakText(response.data.question);
      setStarted(true);


    } catch(error){

      console.error(error);

      alert("Could not start interview");

    }
    finally{

      setLoading(false);

    }

  };



  const submitAnswer = async () => {

    if(!answer.trim()) return;


    try{

      setLoading(true);


      const response = await api.post(
        "/interview/answer",
        {
          interview_id: interviewId,
          answer: answer
        }
      );


      setFeedback(
        response.data.feedback
      );

      setAnswer("");



      if(response.data.finished){

        setFinished(true);
        const fullspeech= `feedback: ${response.data.feedback}. Congratulations you have completed the interview`;
        speakText(fullspeech);
        stopWebcam();
      }
      else{

        setQuestion(
          response.data.question
        );
        const fullspeech= `feedback: ${response.data.feedback}. Next question: ${response.data.question}`;
        speakText(fullspeech);
      }


    }
    catch(error){

      console.error(error);

      alert("Something went wrong");

    }
    finally{

      setLoading(false);

    }

  };



  return (

    <div className="min-h-screen bg-slate-100 py-10">


      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">


        <h1 className="text-3xl font-bold text-slate-800">
          AI Interview Coach
        </h1>


        <p className="text-slate-600 mt-2">
          Practice technical interviews based on your resume.
        </p>



        {
          !started && (

            <button

              onClick={startInterview}

              className="mt-8 bg-cyan-500 text-white px-6 py-3 rounded-lg hover:bg-cyan-600"

            >

              {
                loading 
                ? "Starting..."
                : "Start Interview"
              }

            </button>

          )
        }



        {
          started && !finished && (

            <div className="mt-8">

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

              <div className="bg-slate-100 rounded-lg p-5">


                <h2 className="font-semibold text-lg">
                  Question
                </h2>


                <p className="mt-3 text-slate-700">
                  {question}
                </p>


              </div>

              <div className="flex items-center justify-between mt-6 mb-2">
  <button
    type="button"
    onClick={isRecording ? stopRecording : startRecording}
    disabled={loading || isTranscribing}
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



              <textarea

                className="w-full mt-6 border rounded-lg p-4"

                rows="5"

                placeholder="Type your answer..."

                value={answer}

                onChange={
                  (e)=>setAnswer(e.target.value)
                }

              />



              <button

                onClick={submitAnswer}

                className="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"

              >

                {
                  loading
                  ? "Evaluating..."
                  : "Submit Answer"
                }

              </button>



            </div>

          )
        }




        {
          feedback && (

            <div className="mt-8 bg-blue-50 border rounded-lg p-5">


              <h2 className="font-bold text-lg">
                Feedback
              </h2>


              <p className="mt-3 whitespace-pre-line">
                {feedback}
              </p>


            </div>

          )
        }




        {
          finished && (

            <div className="mt-8 bg-green-50 border rounded-lg p-5">

              <h2 className="text-xl font-bold text-green-700">
                Interview Completed 🎉
              </h2>


              <p className="mt-2">
                You have completed the interview.
              </p>


            </div>

          )
        }



      </div>


    </div>

  );

}


export default Interview;