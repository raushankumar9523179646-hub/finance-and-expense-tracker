import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAuthToken } from "./api.js";

export default function AuthGoogleDone() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const err = params.get("error");
    if (token) {
      setAuthToken(token);
      navigate("/app", { replace: true });
      return;
    }
    if (err) {
      navigate(`/?oauth_error=${encodeURIComponent(err)}`, { replace: true });
      return;
    }
    navigate("/", { replace: true });
  }, [params, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b10] text-slate-400">
      Finishing Google sign-in…
    </div>
  );
}
