import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const API = import.meta.env.VITE_API_URL || ''

const TEMPLATE_PREVIEWS = {
  minimal: {
    accent: '#3b82f6',
    bg: 'linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)',
    badge: 'Free Forever',
    badgeColor: '#22c55e',
    icon: '○',
  },
  elegant: {
    accent: '#c9a84c',
    bg: 'linear-gradient(135deg, #1a1209 0%, #2d1f0a 100%)',
    badge: '৳499',
    badgeColor: '#c9a84c',
    icon: '◇',
    dark: true,
  },
  professional: {
    accent: '#6366f1',
    bg: 'linear-gradient(135deg, #0f1225 0%, #1a1f40 100%)',
    badge: '৳799',
    badgeColor: '#6366f1',
    icon: '▣',
    dark: true,
  },
  academic: {
    accent: '#dc2626',
    bg: 'linear-gradient(135deg, #0d0a0a 0%, #1f0f0f 100%)',
    badge: '৳999',
    badgeColor: '#dc2626',
    icon: '⬡',
    dark: true,
  },
}

export default function TemplateStore() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/api/payment/templates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('masc_token')}` },
      })
      const data = await res.json()
      if (data.success) setTemplates(data.templates)
    } catch {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (!payment) return

    if (payment === 'success') {
      toast.success('Template unlocked successfully!')
      fetchTemplates()
    } else if (payment === 'fail') {
      toast.error('Payment failed. Please try again.')
    } else if (payment === 'cancel') {
      toast('Payment cancelled.', { icon: '↩' })
    } else if (payment === 'already') {
      toast('Template already owned.', { icon: 'ℹ' })
    }

    // Clear params from URL
    navigate('/dashboard/templates', { replace: true })
  }, [searchParams, navigate])

  const handleBuy = async (templateId) => {
    if (paying) return
    setPaying(templateId)
    try {
      const res = await fetch(`${API}/api/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('masc_token')}`,
        },
        body: JSON.stringify({ templateId }),
      })
      const data = await res.json()
      if (data.success && data.gatewayUrl) {
        window.location.href = data.gatewayUrl
      } else {
        toast.error(data.message || 'Payment initiation failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPaying(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const isOrg = user?.role === 'organization' || user?.role === 'admin'

  return (
    <div className="min-h-screen px-4 py-12" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
            Certificate Templates
          </div>
          <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Template Store
          </h1>
          <p className="text-gray-400 max-w-xl">
            Upgrade your certificates with premium templates. One free template included — unlock the rest for your organization.
          </p>
          {!isOrg && (
            <p className="mt-3 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-2 inline-block">
              ⚠ Only approved organizations can purchase templates.
            </p>
          )}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => {
            const ui = TEMPLATE_PREVIEWS[tpl.id] || {}
            const owned = tpl.owned
            const isLoading = paying === tpl.id

            return (
              <div key={tpl.id}
                className="rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1"
                style={{
                  borderColor: owned ? ui.accent + '44' : 'rgba(255,255,255,0.06)',
                  background: 'var(--bg-secondary, #111827)',
                  boxShadow: owned ? `0 0 0 1px ${ui.accent}22` : 'none',
                }}>

                {/* Preview Area */}
                <div className="relative h-40 flex items-center justify-center"
                  style={{ background: ui.bg }}>
                  <span className="text-6xl opacity-30" style={{ color: ui.accent }}>{ui.icon}</span>
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: ui.badgeColor + '22', color: ui.badgeColor, border: `1px solid ${ui.badgeColor}44` }}>
                      {ui.badge}
                    </span>
                  </div>
                  {owned && (
                    <div className="absolute top-3 left-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        ✓ Owned
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="text-white font-semibold text-lg mb-1">{tpl.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{tpl.description}</p>

                  <div className="flex items-center justify-between">
                    <div>
                      {tpl.free ? (
                        <span className="text-green-400 font-semibold">Free</span>
                      ) : (
                        <span className="text-white font-bold text-lg">৳{tpl.price}</span>
                      )}
                    </div>

                    {owned ? (
                      <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                        Active
                      </span>
                    ) : isOrg ? (
                      <button
                        onClick={() => handleBuy(tpl.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        style={{
                          background: ui.accent,
                          color: ui.dark ? '#fff' : '#fff',
                          boxShadow: `0 0 20px ${ui.accent}44`,
                        }}>
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Redirecting…
                          </span>
                        ) : `Buy for ৳${tpl.price}`}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Organizations only</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info note */}
        <p className="text-center text-gray-600 text-xs mt-10">
          Payments processed securely via SSLCommerz. Templates are unlocked instantly after payment.
        </p>
      </div>
    </div>
  )
}
