import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { cognitoSignOut } from "../services/cognitoAuth";

function Navbar() {
  const auth = useAuth();

  return (
    <nav className="bg-slate-900 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-cyan-400">
          Coach
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="transition hover:text-cyan-400">
            Home
          </Link>

          {auth.isAuthenticated ? (
            <>
              <Link to="/upload" className="transition hover:text-cyan-400">
                Upload Resume
              </Link>

              <Link to="/chat" className="transition hover:text-cyan-400">
                Chat
              </Link>

              <Link to="/interview" className="transition hover:text-cyan-400">
                Interview
              </Link>

              <Link to="/history" className="transition hover:text-cyan-400">
                History
              </Link>

              <Link to="/feedback" className="transition hover:text-cyan-400">
                Feedback
              </Link>

              {/* Logged in User Email */}
              <span className="text-sm font-medium text-slate-400">
                {auth.user?.profile?.email}
              </span>

              {/* Cognito Sign Out */}
              <button
                onClick={() => cognitoSignOut(auth)}
                className="transition hover:text-red-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Cognito Sign In / Sign Up Trigger */}
              <button
                onClick={() => auth.signinRedirect()}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
