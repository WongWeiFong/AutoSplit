// src/auth/AuthCallBack.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AuthCallBack() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleAuth() {
      // Exchange URL code for session
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error handling auth callback:", error);
        navigate("/login"); // fallback
        return;
      }

      if (data.session) {
        // Successfully logged in
        navigate("/trips"); // redirect to trips page
      } else {
        navigate("/login");
      }
    }

    handleAuth();
  }, []);

  return <p>Logging in...</p>;
}
