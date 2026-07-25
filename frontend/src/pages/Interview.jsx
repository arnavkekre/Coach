import { useState } from "react";
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

      }
      else{

        setQuestion(
          response.data.question
        );

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


              <div className="bg-slate-100 rounded-lg p-5">


                <h2 className="font-semibold text-lg">
                  Question
                </h2>


                <p className="mt-3 text-slate-700">
                  {question}
                </p>


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