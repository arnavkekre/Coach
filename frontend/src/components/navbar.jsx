import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {supabase} from "../services/supabase";
function Navbar() {
  const [user, setUser] = useState(null);
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      setUser(data.session?.user ?? null);
    });

    const {
      data: {subscription}
    }= supabase.auth.onAuthStateChange(
      (_event, session)=>{
        setUser(session?.user ?? null);
      }
    );

    return ()=>{
      subscription.unsubscribe();
    };
  }, []);
  const logout= async() =>{
    await supabase.auth.signOut();
  }
  return (
    <nav className="bg-slate-900 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-cyan-400">
          Coach
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">

  <Link
    to="/"
    className="transition hover:text-cyan-400"
  >
    Home
  </Link>


  {
    user ? (
      <>
        <Link
          to="/upload"
          className="transition hover:text-cyan-400"
        >
          Upload Resume
        </Link>


        <Link
          to="/chat"
          className="transition hover:text-cyan-400"
        >
          Chat
        </Link>


        <Link
          to="/interview"
          className="transition hover:text-cyan-400"
        >
          Interview
        </Link>


        <Link
          to="/history"
          className="transition hover:text-cyan-400"
        >
          History
        </Link>


        <Link
          to="/feedback"
          className="transition hover:text-cyan-400"
        >
          Feedback
        </Link>


        <button
          onClick={logout}
          className="transition hover:text-red-400"
        >
          Logout
        </button>
      </>
    )
    :
    (
      <>
        <Link
          to="/signup"
          className="transition hover:text-cyan-400"
        >
          Signup
        </Link>


        <Link
          to="/login"
          className="transition hover:text-cyan-400"
        >
          Login
        </Link>
      </>
    )
  }

</div>
      </div>
    </nav>
  );
}

export default Navbar;