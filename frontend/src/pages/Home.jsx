import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-900">
            Ace Your Next Technical Interview
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Coach uses AI to analyze your resume, conduct personalized mock
            interviews, evaluate your answers, and help you improve with
            detailed feedback.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-lg bg-cyan-500 px-6 py-3 text-white hover:bg-cyan-600"
            >
              Get Started
            </Link>

            <Link
              to="/upload"
              className="rounded-lg border border-cyan-500 px-6 py-3 text-cyan-600 hover:bg-cyan-50"
            >
              Upload Resume
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 md:grid-cols-3">

        <div className="rounded-xl bg-white p-8 shadow">
          <div className="text-4xl">📄</div>

          <h2 className="mt-4 text-xl font-bold">
            Resume Analysis
          </h2>

          <p className="mt-3 text-slate-600">
            Upload your resume and let Coach build a personalized knowledge
            base for interview preparation.
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow">
          <div className="text-4xl">💬</div>

          <h2 className="mt-4 text-xl font-bold">
            AI Resume Chat
          </h2>

          <p className="mt-3 text-slate-600">
            Ask questions about your projects, skills, and experience exactly
            like an interviewer would.
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow">
          <div className="text-4xl">🎤</div>

          <h2 className="mt-4 text-xl font-bold">
            Mock Interviews
          </h2>

          <p className="mt-3 text-slate-600">
            Practice AI-generated interview questions and receive instant
            feedback on every answer.
          </p>
        </div>

      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">

          <h2 className="text-center text-3xl font-bold text-slate-800">
            How It Works
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-4">

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-xl font-bold text-white">
                1
              </div>

              <h3 className="mt-4 font-semibold">
                Sign Up
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Create your account securely using Supabase Authentication.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-xl font-bold text-white">
                2
              </div>

              <h3 className="mt-4 font-semibold">
                Upload Resume
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Coach extracts information and prepares your personal knowledge
                base.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-xl font-bold text-white">
                3
              </div>

              <h3 className="mt-4 font-semibold">
                Practice
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Chat with Coach or start a personalized mock interview.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-xl font-bold text-white">
                4
              </div>

              <h3 className="mt-4 font-semibold">
                Improve
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Learn from AI feedback and become interview ready.
              </p>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}

export default Home;