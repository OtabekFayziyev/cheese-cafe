// DEV ONLY — role switcher floating button
// Production'da olib tashlash kerak
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ROLES = [
  { label: '👤 Mijoz',  path: '/user',    color: '#F5C800' },
  { label: '🛠 Admin',  path: '/admin',   color: '#3B82F6' },
  { label: '🚴 Kuryer', path: '/courier', color: '#22C55E' },
]

export function DevSwitcher() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const current = ROLES.find(r => pathname.startsWith(r.path)) ?? ROLES[0]

  // Only show in dev
  if (import.meta.env.PROD) return null

  return (
    <div style={{
      position: 'fixed', bottom: 92, right: 12, zIndex: 9999,
    }}>
      {open && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          marginBottom: 8, alignItems: 'flex-end',
        }}>
          {ROLES.map(role => (
            <button
              key={role.path}
              onClick={() => { navigate(role.path); setOpen(false) }}
              style={{
                padding: '7px 14px', borderRadius: 20,
                background: pathname.startsWith(role.path) ? role.color : '#1A1A1A',
                color: pathname.startsWith(role.path) ? '#1A1A1A' : '#fff',
                border: `2px solid ${role.color}`,
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,.25)',
              }}
            >
              {role.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          background: current.color, color: '#1A1A1A',
          border: 'none', fontSize: 20, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, transition: 'transform .2s',
        }}
        title="Panel almashtirish (dev)"
      >
        {open ? '✕' : '⇄'}
      </button>
    </div>
  )
}
