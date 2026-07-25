import { useState } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";


function Feedback(){

    const [message,setMessage] = useState("");
    const [submitted,setSubmitted] = useState(false);


    const submitFeedback = async()=>{

        const {
            data:{user}
        } = await supabase.auth.getUser();


        if(!user){
            alert("Please login first");
            return;
        }


        await api.post("/feedback",{
            user_id:user.id,
            message:message
        });


        setSubmitted(true);
        setMessage("");

    };


    return (

        <div className="min-h-screen bg-slate-100 flex justify-center p-10">


            <div className="bg-white shadow rounded-xl p-8 w-full max-w-xl">


                <h1 className="text-3xl font-bold">
                    Feedback
                </h1>


                <p className="text-slate-600 mt-2">
                    Help us improve Coach.
                </p>


                {
                    submitted ? (

                        <div className="mt-8 text-green-600 font-semibold">
                            Thanks for your feedback!
                        </div>

                    ) : (

                        <>
                        <textarea
                            className="mt-6 w-full border rounded-lg p-4"
                            rows="5"
                            placeholder="Write your feedback..."
                            value={message}
                            onChange={(e)=>setMessage(e.target.value)}
                        />


                        <button
                            onClick={submitFeedback}
                            className="mt-4 bg-cyan-500 text-white px-6 py-2 rounded-lg"
                        >
                            Submit
                        </button>

                        </>

                    )
                }


            </div>


        </div>

    );

}


export default Feedback;