import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function AcceptInvite() {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  useEffect(() => {
    async function accept() {
      setLoading(true);
      setError('');
      setSuccess('');
      try{
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
          const err = await res.json();
          setError(err.message || 'Invite invalid or expired');
          return;
        }
    
        setSuccess('Successfully joined the trip!');
      } catch (err) {
        console.error(err);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      accept();
    }
  }, [token]);

  if (loading) return <p>Accepting invite...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (success) return <p style={{ color: 'green' }}>{success}</p>;

  return null;
}