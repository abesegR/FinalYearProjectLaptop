import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import ChatContainer from "./components/ChatContainer";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";

const ProtectedRoute = ({ children }) => {
  return localStorage.getItem("laptopai_token") ? (
    children
  ) : (
    <Navigate to="/login" />
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatContainer />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
