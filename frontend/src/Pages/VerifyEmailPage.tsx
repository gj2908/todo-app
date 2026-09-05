import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "../axiosConfig";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.post(`/auth/verify-email/${token}`);
        setMessage(res.data.message || "Email verified");
        setStatus("success");
      } catch (err: any) {
        setMessage(err.response?.data?.message || "Verification link expired or invalid");
        setStatus("error");
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
        {status === "checking" && (
          <>
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-zinc-400">Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-zinc-100 mb-1">Email verified</h1>
            <p className="text-sm text-zinc-500 mb-6">Your email address is confirmed.</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M6 6l10 10M16 6L6 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-zinc-100 mb-1">Verification failed</h1>
            <p className="text-sm text-zinc-500 mb-6">{message}</p>
          </>
        )}
        {status !== "checking" && (
          <Link
            to="/home"
            className="inline-block w-full py-2.5 rounded-lg font-bold text-sm text-black bg-amber-500 hover:bg-amber-400 transition"
          >
            Go to Taskflow
          </Link>
        )}
      </div>
    </div>
  );
}
