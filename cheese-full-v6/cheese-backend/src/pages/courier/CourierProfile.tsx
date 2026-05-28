import React, { useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useCourierStore, VEHICLE_ICONS } from '@/store/courierStore'
import { useFormat, useTelegram } from '@/hooks'
import { CourierShell, CourierPageHeader } from './CourierShell'
import styles from './CourierProfile.module.css'

export default function CourierProfile() {
  const { haptic } = useTelegram()
  const { fmt }    = useFormat()
  const { profile, stats, setOnline } = useCourierStore()
  const [vehicleEdit, setVehicleEdit] = useState(false)

  return (
    <CourierShell>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {VEHICLE_ICONS[profile.vehicleType]}
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{profile.firstName} {profile.lastName}</div>
            <div className={styles.phone}>{profile.phone}</div>
            <div className={styles.rating}>⭐ {profile.rating} · {profile.totalDeliveries} ta yetkazma</div>
            <div className={clsx(styles.statusBadge, profile.isOnline && styles.statusOnline)}>
              <span className={styles.statusDot} />
              {profile.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats card */}
      <div className={styles.statsCard}>
        <div className={styles.statsDecor}>🛵</div>
        <div className={styles.statsTitle}>Statistika</div>
        <div className={styles.statsGrid}>
          {[
            { icon:'☀️', val:stats.todayDeliveries, lbl:'Bugun' },
            { icon:'💰', val:fmt(stats.todayEarnings), lbl:'Bugungi daromad' },
            { icon:'📅', val:stats.weekDeliveries, lbl:'Hafta' },
            { icon:'💎', val:fmt(stats.weekEarnings), lbl:'Haftalik daromad' },
          ].map((s,i) => (
            <div key={i} className={styles.statItem}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statVal}>{s.val}</div>
              <div className={styles.statLbl}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle type */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Transport vositasi</div>
        <div className={styles.vehicleRow}>
          {(Object.entries(VEHICLE_ICONS) as [keyof typeof VEHICLE_ICONS, string][]).map(([type, icon]) => (
            <button key={type}
              className={clsx(styles.vehicleBtn, profile.vehicleType===type && styles.vehicleBtnActive)}
              onClick={() => { haptic.light(); toast.success(`${icon} tanlandi`) }}
            >
              <span className={styles.vehicleIcon}>{icon}</span>
              <span className={styles.vehicleLabel}>
                {type==='bicycle'?'Velosiped':type==='scooter'?'Skuter':'Avto'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Online toggle */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Holat</div>
        <div className={styles.onlineCard}>
          <div>
            <div className={styles.onlineLabel}>{profile.isOnline ? '🟢 Online — Buyurtma qabul qilinyapti' : '🔴 Offline — Dam olish rejimi'}</div>
            <div className={styles.onlineSub}>{profile.isOnline ? 'Yangi buyurtmalar keladi' : 'Buyurtmalar kelmaydi'}</div>
          </div>
          <button
            className={clsx(styles.bigToggle, profile.isOnline && styles.bigToggleOn)}
            onClick={() => { haptic.heavy(); setOnline(!profile.isOnline) }}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </div>

      {/* Menu */}
      <div className={styles.menuList}>
        {[
          { icon:'💬', label:'Yordam markazi', sub:'Muammo? Yozib qoldiring', color:'#E0F7FA' },
          { icon:'📊', label:'Batafsil hisobot', sub:'Oylik statistika', color:'#E8F5E9' },
          { icon:'⚙️', label:'Bildirishnomalar', sub:'Sozlamalar', color:'#F3E5F5' },
          { icon:'📜', label:'Shartnoma va qoidalar', sub:'Kuryerlik shartlari', color:'#FFF3E0' },
        ].map(item => (
          <button key={item.label} className={styles.menuItem}
            onClick={() => { haptic.light(); toast(item.label) }}>
            <div className={styles.menuIcon} style={{background:item.color}}>{item.icon}</div>
            <div className={styles.menuText}>
              <div className={styles.menuLabel}>{item.label}</div>
              <div className={styles.menuSub}>{item.sub}</div>
            </div>
            <span className={styles.menuArrow}>›</span>
          </button>
        ))}
      </div>

      <div className={styles.version}>CHEESE Kuryer v1.0.0</div>
      <div style={{height:24}} />
    </CourierShell>
  )
}
