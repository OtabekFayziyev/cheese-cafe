import React, { useState } from 'react'
import { Phone, CheckCircle, X } from 'lucide-react'
import { useUserStore } from '@/store'
import { userAPI } from '@/api/client'
import { useTelegram } from '@/hooks'
import styles from './PhoneModal.module.css'

interface PhoneModalProps {
  onClose: () => void
}

export function PhoneModal({ onClose }: PhoneModalProps) {
  const { haptic } = useTelegram()
  const setPhone   = useUserStore(s => s.setPhone)
  const [phone, setPhoneVal] = useState('')
  const [done, setDone]      = useState(false)

  const handleSubmit = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) {
      haptic.error()
      return
    }
    const full = `+998${digits.slice(-9)}`
    setPhone(full)
    // Backend ga ham saqlash
    try {
      await userAPI.update({ phone: full })
    } catch (e) {
      // Silent fail — local ga saqlanadi
    }
    haptic.success()
    setDone(true)
    setTimeout(onClose, 1400)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.sheet}>
        <div className={styles.handle} />

        {done ? (
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckCircle size={56} color="#22C55E" strokeWidth={1.5} />
            </div>
            <div className={styles.successTitle}>Raqam saqlandi!</div>
            <div className={styles.successSub}>+998 {phone.slice(-9)}</div>
          </div>
        ) : (
          <>
            <div className={styles.iconWrap}>
              <Phone size={32} color="#F5C800" strokeWidth={1.5} />
            </div>
            <h2 className={styles.title}>Telefon raqamingiz</h2>
            <p className={styles.sub}>
              Buyurtmangiz o'z vaqtida va muammosiz yetkazilishi uchun
              telefon raqamingizni kiriting
            </p>

            <div className={styles.phoneRow}>
              <div className={styles.prefix}>+998</div>
              <input
                className={styles.input}
                type="tel"
                inputMode="numeric"
                placeholder="90 123 45 67"
                maxLength={9}
                value={phone}
                onChange={e => setPhoneVal(e.target.value.replace(/\D/g, '').slice(0, 9))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            {phone.length > 0 && phone.length < 9 && (
              <p className={styles.hint}>
                {9 - phone.length} ta raqam yana kerak
              </p>
            )}

            <button
              className={styles.saveBtn}
              onClick={handleSubmit}
              disabled={phone.length < 9}
            >
              <Phone size={18} strokeWidth={2} />
              Saqlash
            </button>

            <button className={styles.skipBtn} onClick={onClose}>
              Keyinroq
            </button>
          </>
        )}
      </div>
    </div>
  )
}
