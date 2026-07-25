import { useEffect, useState } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";

function History() {

  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    fetchHistory();
  }, []);


  const fetchHistory = async () => {

    const {
      data: { user },
    } = await supabase.auth.getUser();


    if (!user) {
      alert("Please login first");
      return;
    }


    try {

      const response = await api.get(
        `/history/${user.id}`
      );

      setInterviews(response.data);

    } catch(error) {

      console.error(error);
      alert("Failed to load history");

    }

  };


  const openInterview = async (id) => {

    setLoading(true);

    try {

      const response = await api.get(
        `/history/details/${id}`
      );

      setSelectedInterview(response.data);

    } catch(error) {

      console.error(error);

    }

    setLoading(false);

  };


  return (

    <div className="min-h-screen bg-slate-100 p-8">


      <h1 className="text-3xl font-bold text-slate-800 mb-8">
        Interview History
      </h1>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">


        {/* Interview List */}

        <div className="bg-white rounded-xl shadow p-6">

          <h2 className="text-xl font-bold mb-5">
            Previous Interviews
          </h2>


          {
            interviews.length === 0 && (
              <p className="text-slate-500">
                No interviews yet.
              </p>
            )
          }


          {
            interviews.map((item)=> (

              <div
                key={item.id}
                onClick={()=>openInterview(item.id)}
                className="
                  cursor-pointer
                  border
                  rounded-lg
                  p-4
                  mb-3
                  hover:bg-slate-100
                "
              >

                <p className="font-semibold">
                  Interview
                </p>


                <p className="text-sm text-slate-600">
                  Status: {item.status}
                </p>


                <p className="text-sm text-slate-600">
                  Questions: {item.total_questions}
                </p>


                {
                  item.started_at &&
                  <p className="text-xs text-slate-400 mt-2">
                    {
                      new Date(
                        item.started_at
                      ).toLocaleDateString()
                    }
                  </p>
                }


              </div>

            ))
          }


        </div>



        {/* Interview Details */}

        <div className="md:col-span-2 bg-white rounded-xl shadow p-6">


          {
            !selectedInterview && (

              <p className="text-slate-500">
                Select an interview to view details.
              </p>

            )
          }



          {
            loading && (

              <p>
                Loading...
              </p>

            )
          }



          {
            selectedInterview && !loading && (

              <div>


                <h2 className="text-2xl font-bold mb-6">
                  Interview Review
                </h2>



                {
                  selectedInterview.answers.map(
                    (item,index)=>(


                    <div
                      key={index}
                      className="
                        border-b
                        pb-6
                        mb-6
                      "
                    >

                      <h3 className="font-bold">
                        Question {index+1}
                      </h3>


                      <p className="mt-2 text-slate-700">
                        {item.question}
                      </p>



                      <h3 className="font-bold mt-5">
                        Your Answer
                      </h3>


                      <p className="mt-2 text-slate-700">
                        {item.answer}
                      </p>



                      <h3 className="font-bold mt-5">
                        AI Feedback
                      </h3>


                      <p className="
                        mt-2
                        whitespace-pre-wrap
                        text-slate-700
                      ">
                        {item.feedback}
                      </p>


                    </div>


                  ))
                }


              </div>

            )
          }


        </div>


      </div>


    </div>

  );

}


export default History;