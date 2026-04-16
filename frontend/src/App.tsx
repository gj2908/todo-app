import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./Pages/LoginPage";
import RegisterPage from "./Pages/RegisterPage";
import ForgotPasswordPage from "./Pages/ForgotPasswordPage";
import HomePage from "./Pages/HomePage";
import ProfilePage from "./Pages/ProfilePage";
import DocumentViewerPage from "./Pages/DocumentViewerPage";
import { ToastContainer } from "react-toastify";
import { DarkModeProvider } from "./context/DarkModeContext";
import "react-toastify/dist/ReactToastify.css";

interface ProtectedRouteProps {
  element: React.ReactNode;
  path: string;
}

function ProtectedRoute({ element }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  return token ? <>{element}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ForgotPasswordPage />} />
          <Route
            path="/home"
            element={<ProtectedRoute element={<HomePage />} path="/home" />}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute element={<ProfilePage />} path="/profile" />
            }
          />
          <Route
            path="/document-vault/:documentId"
            element={
              <ProtectedRoute element={<DocumentViewerPage />} path="/document-vault/:documentId" />
            }
          />
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </BrowserRouter>
    </DarkModeProvider>
  );
}

export default App;
