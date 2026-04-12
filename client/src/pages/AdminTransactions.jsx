import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || ''

const STATUS_COLORS = {
  completed: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.2)' },
  pending: { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.2)' },
  failed: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.2)' },
  cancelled: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.2)' },
}

export default function AdminTransactions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/')
  }, [user])

  useEffect(() => {
    fetch(`${API}/api/payment/transactions`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('masc_token')}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setTransactions(d.transactions) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.status === filter)
  const totalRevenue = transactions.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0)
  const completed = transactions.filter(t => t.status === 'completed').length

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Template Transactions</h1>
          <p className="text-gray-400 text-sm">All template purchase activity across organizations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: `৳${totalRevenue.toLocaleString()}`, color: '#22c55e' },
            { label: 'Successful', value: completed, color: '#3b82f6' },
            { label: 'Total Orders', value: transactions.length, color: '#8b5cf6' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5 border" style={{ background: 'var(--bg-secondary,#111827)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {['all', 'completed', 'pending', 'failed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: filter === f ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: filter === f ? '#fff' : '#9ca3af',
                border: `1px solid ${filter === f ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
              }}>{f}</button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No transactions found</div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['Order ID', 'Organization', 'Template', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, i) => {
                  const sc = STATUS_COLORS[tx.status] || STATUS_COLORS.pending
                  return (
                    <tr key={tx._id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">{tx.orderId}</td>
                      <td className="px-4 py-3">
                        <div className="text-white text-xs font-medium">{tx.user?.name || '—'}</div>
                        <div className="text-gray-500 text-xs">{tx.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs capitalize">{tx.templateName}</td>
                      <td className="px-4 py-3 text-white font-semibold text-xs">৳{tx.amount}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
