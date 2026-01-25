import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
// import { Session } from '@supabase/supabase-js'

export default function SubmitReceiptPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)

    // ✅ THIS PART GOES HERE
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      alert('Please login first')
      setLoading(false)
      return
    }

    const accessToken = session.access_token

    const formData = new FormData()
    formData.append('file', file)

    await fetch('http://localhost:3000/receipts/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button disabled={loading}>
        {loading ? 'Uploading...' : 'Submit Receipt'}
      </button>
    </form>
  )
}
