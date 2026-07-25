import { useState } from "react";
import api from "../services/api";
import { supabase } from "../services/supabase";
function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: "coach",
      text: "Hi! I've analyzed your resume. Ask me anything about your experience, projects, or interview preparation.",
    },
  ]);

  const [question, setQuestion] = useState("");

  const handleSend = async () => {
  if (!question.trim()) return;

  const userMessage = question;

  setMessages((prev) => [
    ...prev,
    {
      sender: "user",
      text: userMessage,
    },
  ]);

  setQuestion("");

  try {

    const {
      data: { user },
    } = await supabase.auth.getUser();


    if (!user) {
      alert("Please login first");
      return;
    }


    const response = await api.post("/chat", {
      user_id: user.id,
      question: userMessage,
    });


    setMessages((prev) => [
      ...prev,
      {
        sender: "coach",
        text: response.data.answer,
      },
    ]);


  } catch (error) {

    console.error(error);

    setMessages((prev) => [
      ...prev,
      {
        sender: "coach",
        text: "Sorry, something went wrong.",
      },
    ]);

  }
};

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center py-10">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg flex flex-col">

        {/* Header */}
        <div className="border-b p-6">
          <h1 className="text-3xl font-bold text-slate-800">
            Coach AI
          </h1>

          <p className="text-slate-600 mt-2">
            Chat with your AI interview coach.
          </p>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto h-125">

          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[75%] rounded-xl px-4 py-3 ${
                message.sender === "user"
                  ? "ml-auto bg-cyan-500 text-white"
                  : "bg-slate-200 text-slate-900"
              }`}
            >
              {message.text}
            </div>
          ))}

        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-3">

          <input
            type="text"
            placeholder="Ask something about your resume..."
            className="flex-1 border rounded-lg px-4 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button
            onClick={handleSend}
            className="bg-cyan-500 text-white px-6 rounded-lg hover:bg-cyan-600"
          >
            Send
          </button>

        </div>

      </div>
    </div>
  );
}

export default Chat;