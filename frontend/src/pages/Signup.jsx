import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";
function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const handleSignup = async () => {

    const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: name,
    },
  },
});
    
    if (error) {
      alert(error.message);
      return;
    }
    console.log(data.session);
    console.log(data.user);



    /*const user = data.user;


    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: name
      });


    if (profileError) {
      alert(profileError.message);
      return;
    }*/


    alert("Account created! Please check your email to verify your account.");
    navigate("/login");
  };


  return (

    <div className="min-h-screen bg-slate-100 flex items-center justify-center">

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Create Account
        </h1>

        <p className="text-slate-600 mb-6">
          Join Coach and start preparing smarter.
        </p>


        <div className="space-y-4">


          <input
            type="text"
            placeholder="Full Name"
            className="w-full border rounded-lg px-4 py-2"
            value={name}
            onChange={(e)=>setName(e.target.value)}
          />


          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg px-4 py-2"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />


          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded-lg px-4 py-2"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />


          <button
            onClick={handleSignup}
            className="w-full bg-cyan-500 text-white py-2 rounded-lg hover:bg-cyan-600"
          >
            Create Account
          </button>


        </div>

      </div>

    </div>

  );
}


export default Signup;