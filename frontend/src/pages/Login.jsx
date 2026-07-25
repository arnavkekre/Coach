import { useState } from "react";
import { supabase } from "../services/supabase";

function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const handleLogin = async () => {

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });


    if (error) {
      alert(error.message);
      return;
    }


    const user = data.user;


    // Check if profile already exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();


    if (profileError) {
      alert(profileError.message);
      return;
    }


    // Create profile if it does not exist
    if (!profile) {

      const { error: insertError } = await supabase
        .from("profiles").upsert({
  id: user.id,
  full_name: user.user_metadata.full_name,
})
        /*.insert({
          id: user.id,
          full_name: user.user_metadata.full_name,
        });*/


      if (insertError) {
        alert(insertError.message);
        return;
      }

    }


    alert("Login successful");

    // later we will navigate to dashboard here

  };


  return (

    <div className="min-h-screen bg-slate-100 flex items-center justify-center">

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Welcome Back
        </h1>

        <p className="text-slate-600 mb-6">
          Login to continue preparing smarter.
        </p>


        <div className="space-y-4">


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
            onClick={handleLogin}
            className="w-full bg-cyan-500 text-white py-2 rounded-lg hover:bg-cyan-600"
          >
            Login
          </button>


        </div>

      </div>

    </div>

  );
}


export default Login;