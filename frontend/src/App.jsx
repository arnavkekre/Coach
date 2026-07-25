import { useState } from 'react'
import './App.css'
import Navbar from "./components/Navbar";
//import Home from "./pages/Home";
import ResumeUpload from "./pages/ResumeUpload.jsx";
//import Interview from "./pages/Interview";
//import Feedback from "./pages/Feedback";
import Signup from "./pages/Signup.jsx";
import Login from './pages/Login.jsx';
import Chat from './pages/Chat.jsx';
import Interview from "./pages/Interview.jsx";
import Home from './pages/Home.jsx';
import History from './pages/History.jsx';
import Feedback from './pages/Feedback.jsx';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
function App() {
  return (
    <BrowserRouter>

    <Navbar/>
    <Routes>
      <Route path="/" element={<Home/>} />
      <Route path="/upload" element={<ResumeUpload/>} />
      <Route path="/signup" element={<Signup/>} />
      <Route path='/login' element={<Login/>} />
      <Route path="/chat" element={<Chat/>} />
      <Route path="/history" element={<History/>} />
      <Route path="/interview" element={<Interview/>}/>
      <Route path="/feedback" element={<Feedback/>} />
    </Routes>
    </BrowserRouter>
  
)
}

export default App
