// SignInWithGoogle.tsx
import { supabase } from '../../lib/supabaseClient'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function SignInWithGoogle() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null);
  const signIn = async () => {
    const { error} = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) setError(error.message);

  }  

  return <button onClick={signIn}>Continue with Google</button>
}
