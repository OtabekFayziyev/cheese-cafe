import React, { useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAdminStore, ROLE_LABELS } from '@/store/adminStore'
import { adminAPI } from '@/api/client'
import type { AdminRole, AdminUser, AuditLog } from '@/store/adminStore'
import { useFormat, useTelegram } from '@/hooks'
import { AdminShell, AdminPageHeader } from './AdminShell'
import styles from './Settings.module.css'

const DAYS = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba']

export default function Settings() {
  const { haptic } = useTelegram()
  const { fmt }    = useFormat()
  const { settings, updateSettings, setIsOpen, cafeInfo, updateCafeInfo,
          admins, addAdmin, updateAdmin, removeAdmin, auditLogs } = useAdminStore()

  const [tab, setTab] = useState<'hours'|'delivery'|'info'|'roles'|'audit'>('hours')
  const [newAdmin, setNewAdmin] = useState({ name:'', telegramId:'', phone:'', role:'cashier' as AdminRole })
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [logFilter, setLogFilter] = useState('')

  const updateDay = (idx:number, field:string, val:any) =>
    updateSettings({ workHours: settings.workHours.map((d,i) => i===idx ? {...d,[field]:val} : d) })

  const handleSave = () => { haptic.success(); toast.success('✅ Sozlamalar saqlandi!') }

  const handleAddAdmin = async () => {
    if (!newAdmin.telegramId) { toast.error('Telegram ID kiriting!'); return }
    const roleMap: Record<string, string> = {
      'super_admin': 'ADMIN',
      'moderator':   'MODERATOR',
      'cashier':     'CASHIER',
      'courier':     'COURIER',
    }
    const backendRole = roleMap[newAdmin.role] || 'CASHIER'

    try {
      // Find user by telegramId
      const usersData = await adminAPI.users({ limit: 500 })
      const target = (usersData.users || []).find((u: any) =>
        String(u.telegramId) === String(newAdmin.telegramId)
      )
      if (!target) {
        toast.error('User topilmadi! Avval botga /start bosishi kerak.')
        return
      }

      // Update role via adminAPI
      await adminAPI.updateUserRole(target.id, backendRole)

      addAdmin({
        id: `admin-${Date.now()}`,
        telegramId: Number(newAdmin.telegramId),
        name: `${target.firstName || ''} ${target.lastName || ''}`.trim() || 'Noma\'lum',
        phone: target.phone || '',
        role: newAdmin.role,
        addedAt: new Date().toISOString(),
        isActive: true,
      })
      haptic.success()
      toast.success(`✅ Rol berildi: ${backendRole}`)
      setNewAdmin({ name:'', telegramId:'', phone:'', role:'cashier' })
      setAddingAdmin(false)
    } catch {
      toast.error('Xato! Qayta urinib ko\'ring.')
    }
  }

  const filteredLogs = auditLogs.filter(l =>
    !logFilter || l.action.toLowerCase().includes(logFilter.toLowerCase()) ||
    l.adminName.toLowerCase().includes(logFilter.toLowerCase()) ||
    (l.entityId||'').includes(logFilter)
  )

  return (
    <AdminShell>
      <AdminPageHeader title="Sozlamalar" />

      {/* Cafe toggle */}
      <div className={styles.mainToggle}>
        <div>
          <div className={styles.mainToggleTitle}>Cafe holati</div>
          <div className={styles.mainToggleSub}>{settings.isOpen?'Buyurtma qabul qilinmoqda':'Buyurtma to\'xtatilgan'}</div>
        </div>
        <button className={clsx(styles.bigToggle, settings.isOpen && styles.bigToggleOpen)}
          onClick={() => { haptic.medium(); setIsOpen(!settings.isOpen) }}>
          <span className={styles.bigToggleThumb} />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {([
          {k:'hours',   l:'⏰ Vaqt'},
          {k:'delivery',l:'🛵 Yetkazish'},
          {k:'info',    l:'📋 Ma\'lumot'},
          {k:'roles',   l:'👥 Adminlar'},
          {k:'audit',   l:'📜 Log'},
        ] as {k:typeof tab;l:string}[]).map(t => (
          <button key={t.k}
            className={clsx(styles.tab, tab===t.k && styles.tabActive)}
            onClick={() => { haptic.light(); setTab(t.k) }}
          >
            {t.l}
            {t.k==='audit' && auditLogs.length>0 && <span className={styles.tabBadge}>{auditLogs.length}</span>}
          </button>
        ))}
      </div>

      {/* Work hours */}
      {tab==='hours' && (
        <div className={styles.sec}>
          <div className={styles.note}>💡 Ish vaqtini har kun uchun alohida sozlang.</div>
          {settings.workHours.map((d, i) => (
            <div key={i} className={clsx(styles.dayRow, d.isOff && styles.dayOff)}>
              <div className={styles.dayName}>{DAYS[i]}</div>
              <div className={styles.dayCtrl}>
                {!d.isOff ? (
                  <>
                    <input type="time" className={styles.timeInput} value={d.open}  onChange={e=>updateDay(i,'open',e.target.value)} />
                    <span className={styles.timeSep}>–</span>
                    <input type="time" className={styles.timeInput} value={d.close} onChange={e=>updateDay(i,'close',e.target.value)} />
                  </>
                ) : <span className={styles.dayOffLbl}>Dam olish</span>}
                <label className={styles.toggle}>
                  <input type="checkbox" checked={d.isOff} onChange={e=>updateDay(i,'isOff',e.target.checked)} />
                  <span className={styles.toggleTrack} />
                </label>
              </div>
            </div>
          ))}
          <button className={styles.saveBtn} onClick={handleSave}>✅ Saqlash</button>
        </div>
      )}

      {/* Delivery */}
      {tab==='delivery' && (
        <div className={styles.sec}>
          <div className={styles.note}>💡 Narx = Boshlang'ich + (km × km narxi)</div>
          {[
            {label:"Boshlang'ich narx (so'm)", key:'deliveryFeeBase', step:500},
            {label:'Har km uchun (so\'m)',     key:'deliveryFeePerKm', step:100},
            {label:'Minimum buyurtma (so\'m)', key:'minOrderAmount',  step:1000},
            {label:'Taxminiy vaqt (daqiqa)',   key:'estimatedTime',   step:5},
          ].map(f => (
            <div key={f.key} className={styles.settRow}>
              <label className={styles.settLabel}>{f.label}</label>
              <input type="number" step={f.step} className={styles.settInput}
                value={(settings as any)[f.key]}
                onChange={e => updateSettings({ [f.key]: Number(e.target.value) } as any)} />
            </div>
          ))}
          <div className={styles.previewCard}>
            <div className={styles.previewTitle}>Hisob misoli:</div>
            {[3,5,8,12].map(km => (
              <div key={km} className={styles.previewRow}>
                <span>{km} km:</span>
                <span>{fmt(settings.deliveryFeeBase + km*settings.deliveryFeePerKm)}</span>
              </div>
            ))}
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>✅ Saqlash</button>
        </div>
      )}

      {/* Cafe info */}
      {tab==='info' && (
        <div className={styles.sec}>
          {[
            {label:'Asosiy telefon',  key:'phone',      type:'tel'},
            {label:'Qo\'shimcha tel', key:'phone2',     type:'tel'},
            {label:'Instagram',       key:'instagram',  type:'text'},
            {label:'Telegram',        key:'telegram',   type:'text'},
            {label:'Manzil',          key:'address',    type:'text'},
            {label:'Xarita havolasi', key:'mapLink',    type:'url'},
          ].map(f => (
            <div key={f.key} className={styles.settRow}>
              <label className={styles.settLabel}>{f.label}</label>
              <input type={f.type} className={styles.settInput}
                value={(cafeInfo as any)[f.key]||''}
                onChange={e => updateCafeInfo({ [f.key]: e.target.value } as any)}
                placeholder={f.label+'...'}
              />
            </div>
          ))}
          <button className={styles.saveBtn} onClick={handleSave}>✅ Saqlash</button>
        </div>
      )}

      {/* Roles */}
      {tab==='roles' && (
        <div className={styles.sec}>
          <div className={styles.note}>
            🔐 <b>Super Admin</b> — hamma narsa<br/>
            🛠 <b>Moderator</b> — faqat menyu<br/>
            🧾 <b>Kassir/Kuryer</b> — faqat buyurtma status
          </div>
          {admins.map(a => (
            <div key={a.id} className={clsx(styles.adminRow, !a.isActive && styles.adminInactive)}>
              <div className={styles.adminAva}>{a.name[0]}</div>
              <div className={styles.adminInfo}>
                <div className={styles.adminName}>{a.name}</div>
                <div className={styles.adminMeta}>{a.phone} · ID: {a.telegramId}</div>
              </div>
              <div>
                <div className={styles.roleBadge} style={{
                  background: a.role==='super_admin'?'rgba(245,200,0,.15)':a.role==='moderator'?'rgba(139,92,246,.15)':'rgba(34,197,94,.15)',
                  color: a.role==='super_admin'?'#C9A200':a.role==='moderator'?'#8B5CF6':'#22C55E',
                }}>
                  {ROLE_LABELS[a.role]}
                </div>
                <div style={{display:'flex',gap:4,marginTop:5}}>
                  <button className={styles.adminToggle}
                    onClick={() => updateAdmin(a.id, {isActive:!a.isActive})}>
                    {a.isActive?'😴 To\'xtat':'▶ Faollashtir'}
                  </button>
                  {a.role !== 'super_admin' && (
                    <button className={styles.adminDel} onClick={() => { removeAdmin(a.id); toast.success(`${a.name} o'chirildi`) }}>🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {addingAdmin ? (
            <div className={styles.addAdminCard}>
              <div className={styles.settRow}><label className={styles.settLabel}>Ism</label><input className={styles.settInput} value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin,name:e.target.value})} placeholder="To'liq ism..." /></div>
              <div className={styles.settRow}><label className={styles.settLabel}>Telegram ID</label><input type="number" className={styles.settInput} value={newAdmin.telegramId} onChange={e=>setNewAdmin({...newAdmin,telegramId:e.target.value})} placeholder="123456789" /></div>
              <div className={styles.settRow}><label className={styles.settLabel}>Telefon</label><input className={styles.settInput} value={newAdmin.phone} onChange={e=>setNewAdmin({...newAdmin,phone:e.target.value})} placeholder="+998..." /></div>
              <div className={styles.settRow}>
                <label className={styles.settLabel}>Rol</label>
                <select className={styles.settInput} value={newAdmin.role} onChange={e=>setNewAdmin({...newAdmin,role:e.target.value as AdminRole})}>
                  {Object.entries(ROLE_LABELS).filter(([k])=>k!=='super_admin').map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className={styles.cancelBtn} onClick={()=>setAddingAdmin(false)}>Bekor</button>
                <button className={styles.saveBtn} onClick={handleAddAdmin}>Qo'shish</button>
              </div>
            </div>
          ) : (
            <button className={styles.addAdminBtn} onClick={()=>setAddingAdmin(true)}>+ Yangi admin qo'shish</button>
          )}
        </div>
      )}

      {/* Audit log */}
      {tab==='audit' && (
        <div className={styles.sec}>
          <input className={styles.settInput} style={{marginBottom:10}}
            placeholder="🔍 Qidirish..." value={logFilter} onChange={e=>setLogFilter(e.target.value)} />
          {filteredLogs.length === 0 && <div className={styles.noLogs}>Hali log yo'q</div>}
          {filteredLogs.map(log => (
            <div key={log.id} className={styles.logRow}>
              <div className={styles.logMeta}>
                <span className={styles.logAdmin}>{log.adminName}</span>
                <span className={styles.logTime}>{new Date(log.timestamp).toLocaleString('uz-UZ',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div className={styles.logAction}>{log.action}</div>
              {log.entityId && <div className={styles.logEntity}>{log.entity} · {log.entityId}</div>}
              {(log.oldValue||log.newValue) && (
                <div className={styles.logChange}>
                  {log.oldValue && <span className={styles.logOld}>{log.oldValue}</span>}
                  {log.oldValue && log.newValue && <span> → </span>}
                  {log.newValue && <span className={styles.logNew}>{log.newValue}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
