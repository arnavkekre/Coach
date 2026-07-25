import { useState } from "react";
import { supabase } from "../services/supabase";
import api from "../services/api"
function ResumeUpload() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };
  const uploadResume= async ()=>{
    if(!file){
        alert("Choose a file first")
        return
    }
    const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  alert("Please login first");
  return;
}
    const formData= new FormData()
    formData.append("resume", file)
    formData.append("user_id", user.id);
    try{
        const response=  await api.post(
            "/upload-resume",
            formData
        )
        console.log("Upload successful!");
        console.log(response.data);
    }
    catch (error) {
    console.error(error.response?.data || error);
}
  }
  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">
          Resume Upload
        </h1>

        <p className="mb-8 text-slate-600">
          Upload your resume so Coach can analyze it and personalize interview
          questions.
        </p>

        {/* Upload Box */}
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            className="mb-4"
          />

          <p className="text-sm text-slate-500">
            Supported formats:
            <span className="font-semibold"> PDF (.pdf)</span>,
            <span className="font-semibold"> DOC (.doc)</span>,
            <span className="font-semibold"> DOCX (.docx)</span>
          </p>

          <p className="mt-2 text-sm text-red-500">
            Maximum file size: 5 MB
          </p>
        </div>

        {/* Selected File */}
        {file && (
          <div className="mt-8 rounded-lg bg-slate-100 p-4">
            <h2 className="font-semibold">Selected Resume</h2>

            <p className="mt-2">{file.name}</p>

            <div className="mt-6 flex gap-4">
              <button className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700">
                View Resume
              </button>

              <button className="rounded-lg bg-green-600 px-5 py-2 text-white hover:bg-green-700">
                Edit Resume
              </button>

              <button className="rounded-lg bg-red-600 px-5 py-2 text-white hover:bg-red-700">
                Remove
              </button>

              <button onClick={uploadResume} className="rounded-lg bg-green-600 px-5 py-2 text-white hover:bg-green-700">
                Upload Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeUpload;