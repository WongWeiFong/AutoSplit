import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accept = async () => {
      const { data: session } = await supabase.auth.getSession();

      // If not logged in, force Google login
      if (!session.session) {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.href,
          },
        });
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/invites/accept/${token}`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        },
      );

      if (!res.ok) {
        alert('Invite invalid or expired');
        navigate('/login');
        return;
      }

      const { tripId } = await res.json();
      navigate(`/trips/${tripId}`);
    };

    accept();
  }, [token]);

  return <p>Accepting invite…</p>;
}
