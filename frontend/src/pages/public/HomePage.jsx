import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '@store/slices/authSlice';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import {
  BoltIcon, CubeIcon, ChartBarIcon, UsersIcon, CloudIcon,
  ShoppingCartIcon, CurrencyDollarIcon, ShieldCheckIcon,
  ArrowRightIcon, CheckIcon, BuildingStorefrontIcon,
  TruckIcon, ArrowsRightLeftIcon, DocumentChartBarIcon,
  DevicePhoneMobileIcon, ClipboardDocumentListIcon,
  BriefcaseIcon, BookOpenIcon, SparklesIcon,
} from '@heroicons/react/24/outline';

/* ─── Fade-in on scroll ─────────────────────────────────────────────────────── */
function Fade({ children, delay = 0, style = {}, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Browser frame wrapper ─────────────────────────────────────────────────── */
function BrowserFrame({ children, url = 'app.probusinesscloud.com', style = {} }) {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.10)',
      background: '#1a2035', ...style,
    }}>
      <div style={{ background: '#242b42', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ef4444','#f59e0b','#22c55e'].map(col => (
            <span key={col} style={{ width: 10, height: 10, borderRadius: '50%', background: col, display: 'block', flexShrink: 0 }} />
          ))}
        </div>
        <div style={{ flex: 1, background: '#1a2035', borderRadius: 5, padding: '4px 12px', fontSize: 11, color: '#6b7ea8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#4ade80' }}>🔒</span>{url}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Dashboard UI mockup ───────────────────────────────────────────────────── */
function DashboardPreview() {
  const kpis = [
    { label: 'Revenue',   value: 'Rs 1,25,500', change: '+14.2%', pos: true,  color: '#3b82f6' },
    { label: 'Profit',    value: 'Rs 71,700',   change: '+8.1%',  pos: true,  color: '#6366f1' },
    { label: 'Orders',    value: '28 sales',    change: '+3',     pos: true,  color: '#f59e0b' },
    { label: 'Low Stock', value: '9 items',     change: 'Alert',  pos: false, color: '#ef4444' },
  ];
  const sales = [
    { ref: 'SAL-0007', customer: 'Walk-in Customer', amount: 'Rs 1,050', paid: true  },
    { ref: 'SAL-0006', customer: 'Ahmed Ali',         amount: 'Rs 2,249', paid: true  },
    { ref: 'SAL-0005', customer: 'Walk-in Customer', amount: 'Rs 2,050', paid: true  },
    { ref: 'SAL-0004', customer: 'Sara Khan',         amount: 'Rs 3,450', paid: false },
  ];
  const bars = [35, 58, 42, 85, 68, 50, 78];
  return (
    <div style={{ display: 'flex', height: 390, fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 56, background: '#0c1427', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 4, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }} />
        </div>
        {[true,false,false,false,false,false,false].map((a, i) => (
          <div key={i} style={{ width: 32, height: 32, borderRadius: 7, background: a ? 'rgba(99,102,241,0.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1px 0' }}>
            <div style={{ width: a?13:11, height: a?13:11, borderRadius: 3, background: a ? '#93c5fd' : '#3d4e6a' }} />
          </div>
        ))}
      </div>
      {/* Main content */}
      <div style={{ flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Dashboard</div>
            <div style={{ fontSize: 9, color: '#94a3b8' }}>Wed, 20 August 2026</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 6, padding: '5px 12px', fontSize: 9.5, fontWeight: 700, color: 'white' }}>Open POS</div>
        </div>
        <div style={{ padding: '10px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, flexShrink: 0 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 9, padding: '9px 11px', borderLeft: `3px solid ${k.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 7.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0f172a', margin: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</div>
              <div style={{ fontSize: 8.5, color: k.pos ? '#10b981' : '#ef4444', fontWeight: 700 }}>{k.change}</div>
            </div>
          ))}
        </div>
        <div style={{ margin: '9px 14px 0', background: 'white', borderRadius: 9, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flexShrink: 0 }}>
          <div style={{ padding: '8px 13px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>Recent Sales</span>
            <span style={{ fontSize: 8.5, color: '#6366f1', fontWeight: 600 }}>View all →</span>
          </div>
          {sales.map((s, i) => (
            <div key={i} style={{ padding: '6px 13px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < 3 ? '1px solid #f8fafc' : 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, flexShrink: 0 }}>🛍</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8.5, fontWeight: 700, color: '#0f172a' }}>{s.ref}</div>
                <div style={{ fontSize: 7.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.customer}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981' }}>{s.amount}</span>
              <span style={{ fontSize: 7.5, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: s.paid ? '#dcfce7' : '#fef3c7', color: s.paid ? '#16a34a' : '#b45309' }}>{s.paid?'Paid':'Due'}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Right chart panel */}
      <div style={{ width: 130, background: 'white', borderLeft: '1px solid #f1f5f9', padding: '12px 10px', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>Weekly Sales</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 65 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: (i===3||i===6) ? 'linear-gradient(to top,#4f46e5,#7c3aed)' : 'linear-gradient(to top,rgba(79,70,229,0.2),rgba(124,58,237,0.3))', borderRadius: '2px 2px 0 0' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 7, color: '#94a3b8' }}>
          {'MTWTFSS'.split('').map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div style={{ marginTop: 12, fontSize: 9.5, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Stock Alerts</div>
        {[
          { n: 'Nike Trouser',  s: 'Out', c: '#ef4444', bg: '#fef2f2' },
          { n: 'Round Neck T',  s: 'Low', c: '#f59e0b', bg: '#fffbeb' },
          { n: 'Polo Basic',    s: 'Low', c: '#f59e0b', bg: '#fffbeb' },
        ].map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', gap: 4 }}>
            <span style={{ fontSize: 8, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{it.n}</span>
            <span style={{ fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: it.bg, color: it.c, flexShrink: 0 }}>{it.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── POS UI mockup ─────────────────────────────────────────────────────────── */
function POSPreview() {
  const products = [
    { name: 'Nike Trouser',   sku: 'T-001', price: 1200, qty: 5, color: '#3b82f6' },
    { name: 'Polo Basic Tee', sku: 'T-002', price: 850,  qty: 3, color: '#6366f1' },
    { name: 'Denim Jacket',   sku: 'J-001', price: 3500, qty: 1, color: '#8b5cf6' },
    { name: 'Classic Chinos', sku: 'P-001', price: 1800, qty: 2, color: '#f59e0b' },
    { name: 'Cotton Kameez',  sku: 'K-001', price: 950,  qty: 4, color: '#10b981' },
    { name: 'Linen Shirt',    sku: 'S-001', price: 1400, qty: 8, color: '#ec4899' },
  ];
  const cart = [
    { name: 'Nike Trouser',   qty: 2, price: 1200, subtotal: 2400 },
    { name: 'Polo Basic Tee', qty: 1, price: 850,  subtotal: 850  },
    { name: 'Denim Jacket',   qty: 1, price: 3500, subtotal: 3500 },
  ];
  return (
    <div style={{ display: 'flex', height: 390, fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>
      {/* Product panel */}
      <div style={{ flex: '0 0 55%', background: '#f8fafc', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>
        <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>🔍</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>Search products by name or SKU...</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', background: 'white', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          {['All','Tops','Bottoms','Jackets'].map((cat, i) => (
            <span key={cat} style={{ padding: '4px 11px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: i===0 ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#f1f5f9', color: i===0 ? 'white' : '#64748b', flexShrink: 0 }}>{cat}</span>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, alignContent: 'start' }}>
          {products.map((p, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 8, padding: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', cursor: 'pointer' }}>
              <div style={{ width: '100%', height: 38, borderRadius: 6, background: `linear-gradient(135deg,${p.color}20,${p.color}10)`, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>👕</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontSize: 7.5, color: '#94a3b8', margin: '2px 0' }}>Qty: {p.qty}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#4f46e5' }}>Rs {p.price.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Cart panel */}
      <div style={{ flex: '0 0 45%', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '11px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>Cart (3 items)</span>
          <span style={{ fontSize: 8.5, color: '#6366f1', fontWeight: 600 }}>Clear</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {cart.map((item, i) => (
            <div key={i} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f8fafc' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>Rs {item.price.toLocaleString()} × {item.qty}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {['−',item.qty,'+'].map((v, j) => (
                  <span key={j} style={{ width: 18, height: 18, borderRadius: 4, background: j===1?'transparent':'#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: j===1?9.5:11, color: j===1?'#0f172a':'#64748b', fontWeight: j===1?700:400, cursor: j!==1?'pointer':'default' }}>{v}</span>
                ))}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#10b981', minWidth: 45, textAlign: 'right' }}>Rs {item.subtotal.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          {[['Subtotal','Rs 6,750','#475569'],['Discount','- Rs 200','#10b981']].map(([l,v,c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, marginBottom: 4, color: c }}><span style={{ color: '#64748b' }}>{l}</span><span style={{ color: c }}>{v}</span></div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#0f172a', borderTop: '1px solid #f1f5f9', paddingTop: 8, marginBottom: 10 }}>
            <span>Total</span><span>Rs 6,550</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 7 }}>
            {[['Cash','#16a34a','#dcfce7','#bbf7d0'],['Card','#0369a1','#e0f2fe','#bae6fd']].map(([m,tc,bg,bc]) => (
              <button key={m} style={{ padding: '7px', borderRadius: 7, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: bg, color: tc, border: `1px solid ${bc}` }}>{m}</button>
            ))}
          </div>
          <button style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white', fontSize: 11, fontWeight: 700, boxShadow: '0 4px 14px rgba(79,70,229,0.35)' }}>
            Process Sale
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Analytics mockup ──────────────────────────────────────────────────────── */
function AnalyticsPreview() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
  const revBars = [42, 58, 50, 72, 65, 80, 70, 88];
  const expBars = [28, 35, 30, 40, 38, 45, 36, 42];
  const metrics = [
    { label: 'Total Revenue', value: 'Rs 9,85,500', change: '+24.3%', pos: true,  color: '#4f46e5' },
    { label: 'Net Profit',    value: 'Rs 3,42,200', change: '+18.7%', pos: true,  color: '#10b981' },
    { label: 'Total Orders',  value: '1,284 sales', change: '+12%',   pos: true,  color: '#f59e0b' },
    { label: 'Avg Order',     value: 'Rs 2,750',    change: '+6.2%',  pos: true,  color: '#8b5cf6' },
  ];
  return (
    <div style={{ display: 'flex', height: 390, fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>
      <div style={{ flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Sales Reports</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Daily','Monthly','Yearly'].map((t, i) => (
              <span key={t} style={{ padding: '4px 10px', borderRadius: 5, fontSize: 8.5, fontWeight: 600, background: i===1?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#f1f5f9', color: i===1?'white':'#64748b' }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: '10px 14px 0', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, flexShrink: 0 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 9, padding: '9px 11px', borderTop: `3px solid ${m.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 7.5, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', margin: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</div>
              <div style={{ fontSize: 8.5, color: m.pos ? '#10b981' : '#ef4444', fontWeight: 700 }}>{m.change}</div>
            </div>
          ))}
        </div>
        <div style={{ margin: '10px 14px', background: 'white', borderRadius: 9, padding: '12px 14px', flex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', marginBottom: 10 }}>Revenue vs Expenses — 2026</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingBottom: 2 }}>
            {months.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 100 }}>
                  <div style={{ flex: 1, height: `${revBars[i]}%`, background: 'linear-gradient(to top,#4f46e5,#7c3aed)', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ flex: 1, height: `${expBars[i]}%`, background: 'linear-gradient(to top,rgba(239,68,68,0.5),rgba(239,68,68,0.3))', borderRadius: '2px 2px 0 0' }} />
                </div>
                <span style={{ fontSize: 7, color: '#94a3b8' }}>{m}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            {[['Revenue','#4f46e5'],['Expenses','rgba(239,68,68,0.7)']].map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 8, borderRadius: 2, background: color }} />
                <span style={{ fontSize: 8.5, color: '#64748b', fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const ALL_FEATURES = [
  { icon: CurrencyDollarIcon, title: 'Point of Sale',      desc: 'Fast, intuitive billing. Process sales, manage cart, apply discounts and print receipts instantly.',     color: '#3b82f6', rgb: '59,130,246'   },
  { icon: CubeIcon,           title: 'Smart Inventory',    desc: 'Real-time stock tracking. Get low-stock alerts and manage all products across categories and brands.',     color: '#6366f1', rgb: '99,102,241'   },
  { icon: ShoppingCartIcon,   title: 'Sales & Returns',    desc: 'Complete transaction management with full history, payment tracking, and hassle-free return processing.',    color: '#8b5cf6', rgb: '139,92,246'   },
  { icon: ArrowsRightLeftIcon,title: 'Purchase Orders',    desc: 'Manage all supplier purchases. Track received stock, update inventory and monitor vendor relationships.',    color: '#06b6d4', rgb: '6,182,212'    },
  { icon: ChartBarIcon,       title: 'Reports & Analytics',desc: 'Comprehensive business intelligence. Track revenue, profit, top products and export for deeper analysis.',   color: '#10b981', rgb: '16,185,129'   },
  { icon: UsersIcon,          title: 'Roles & Permissions',desc: 'Fine-grained access control. Define exactly what each employee can see and do across every module.',        color: '#f59e0b', rgb: '245,158,11'   },
  { icon: TruckIcon,          title: 'Supplier Management',desc: 'Centralized supplier directory with purchase history, outstanding payments and contact management.',         color: '#ec4899', rgb: '236,72,153'   },
  { icon: BuildingStorefrontIcon, title: 'Customer CRM',  desc: 'Build lasting customer relationships. Track purchases, credit balances and customer payment history.',       color: '#14b8a6', rgb: '20,184,166'   },
  { icon: CloudIcon,          title: 'Secure Cloud Backup',desc: 'Your data is always protected. Automatic backups with encrypted storage and one-click restore functionality.',color: '#64748b', rgb: '100,116,139'  },
];

const BENEFITS = [
  { icon: '⚡', text: 'Fast POS Checkout' },
  { icon: '📦', text: 'Live Stock Tracking' },
  { icon: '📊', text: 'Business Analytics' },
  { icon: '🔒', text: 'Role-Based Access' },
  { icon: '☁️', text: 'Secure Cloud Backup' },
  { icon: '📱', text: 'Works on Any Device' },
];

const ROLES = [
  { title: 'Admin',           icon: '👑', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)',  border: 'rgba(79,70,229,0.2)',  desc: 'Full system access. Manages all modules, users, settings and reports.',              features: ['All modules','User management','Settings','Reports & exports'] },
  { title: 'Manager',         icon: '👔', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', desc: 'Operational access. Views reports and manages transactions without system settings.',  features: ['Sales & POS','Inventory control','Customer & suppliers','View reports'] },
  { title: 'Cashier',         icon: '🧾', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', desc: 'POS-focused access. Processes sales and returns without inventory or admin access.',   features: ['Point of Sale','Process returns','View products','Print receipts'] },
  { title: 'Custom Role',     icon: '⚙️', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', desc: 'Build any role you need. Mix and match permissions to fit your exact business structure.', features: ['Choose any modules','Per-module actions','Instant updates','Unlimited roles'] },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { c, isDark } = usePublicTheme();
  const isAuth = useSelector(selectIsAuth);

  return (
    <div style={{ color: c.text }}>

      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section className="pub-hero-bg" style={{ padding: '6.5rem 1.5rem 0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', position: 'relative', overflow: 'hidden' }}>
        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-5%',   width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 65%)', pointerEvents: 'none', animation: 'pub-glow 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-8%',   width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)',   pointerEvents: 'none', animation: 'pub-glow 18s ease-in-out infinite 6s' }} />
        <div style={{ position: 'absolute', top: '30%',  left: '20%',    width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 65%)',   pointerEvents: 'none', animation: 'pub-glow 20s ease-in-out infinite 3s' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative', zIndex: 2 }}>

          {/* Badge */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', animation: 'pub-fade-up 0.5s ease both' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.125rem', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#86efac', animation: 'pub-glow 2s ease-in-out infinite', display: 'inline-block', boxShadow: '0 0 8px rgba(134,239,172,0.6)' }} />
              Cloud-Based POS &amp; Business Management
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ textAlign: 'center', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.07, letterSpacing: '-0.035em', color: '#ffffff', marginBottom: '1.5rem', animation: 'pub-fade-up 0.6s ease 0.1s both' }}>
            The Complete Platform for<br />
            <span style={{ background: 'linear-gradient(135deg, #a5f3fc 0%, #c4b5fd 50%, #fda4af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Modern Businesses
            </span>
          </h1>

          {/* Subtext */}
          <p style={{ textAlign: 'center', fontSize: 'clamp(1rem, 2vw, 1.2rem)', lineHeight: 1.75, color: 'rgba(255,255,255,0.72)', maxWidth: 620, margin: '0 auto 2.5rem', animation: 'pub-fade-up 0.6s ease 0.2s both' }}>
            Manage sales, inventory, customers, purchases and your entire business operations from one powerful, cloud-connected platform.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem', animation: 'pub-fade-up 0.6s ease 0.3s both' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2.25rem', borderRadius: 50, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', background: 'white', color: '#4f46e5', boxShadow: '0 10px 40px rgba(0,0,0,0.25)', transition: 'all 0.2s' }}>
              {isAuth ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRightIcon style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/features" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2.25rem', borderRadius: 50, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', color: 'white', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
              Explore Features
            </Link>
          </div>

          {/* Trust pills */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.75rem', animation: 'pub-fade-up 0.6s ease 0.4s both', marginBottom: '4rem' }}>
            {['No Setup Fee','Multi-User Access','Secure & Encrypted','Cloud Backup'].map(t => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
                <CheckIcon style={{ width: 13, height: 13, color: '#86efac' }} />{t}
              </span>
            ))}
          </div>

          {/* Browser mockup — centered */}
          <div className="pub-hero-mockup" style={{ position: 'relative', maxWidth: 900, margin: '0 auto', animation: 'pub-fade-up 0.8s ease 0.5s both' }}>
            {/* Floating stat card — left */}
            <div className="pub-hero-float" style={{ position: 'absolute', left: -60, top: 60, zIndex: 10, background: 'white', borderRadius: 14, padding: '14px 18px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', minWidth: 145, animationDelay: '0s' }}>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 3 }}>Rs 12,550</div>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700, marginTop: 2 }}>↑ 14.2% vs yesterday</div>
            </div>
            {/* Floating stat card — right */}
            <div className="pub-hero-float" style={{ position: 'absolute', right: -55, top: 100, zIndex: 10, background: 'white', borderRadius: 14, padding: '14px 18px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', minWidth: 140, animationDelay: '2s' }}>
              <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Inventory Items</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginTop: 3 }}>1,284</div>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginTop: 2 }}>Across 24 categories</div>
            </div>
            {/* Floating stat card — bottom right */}
            <div className="pub-hero-float" style={{ position: 'absolute', right: -20, bottom: 60, zIndex: 10, background: 'white', borderRadius: 14, padding: '12px 16px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', minWidth: 130, animationDelay: '4s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>500+</div>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 600 }}>Businesses trust us</div>
                </div>
              </div>
            </div>

            <BrowserFrame url="app.probusinesscloud.com/dashboard" style={{ transform: 'perspective(1200px) rotateX(3deg)', transformOrigin: 'top center' }}>
              <DashboardPreview />
            </BrowserFrame>
          </div>
        </div>

        <HeroWave />
      </section>

      {/* ═══ TRUST / BENEFITS BAR ═══════════════════════════════════════════ */}
      <section style={{ background: c.bgDeep, padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: c.textDimmer }}>
              Trusted by garment shops, retailers and businesses across Pakistan
            </p>
          </Fade>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {BENEFITS.map((b, i) => (
              <Fade key={b.text} delay={i * 60}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem', padding: '1.25rem 1rem', background: c.bgCard, borderRadius: 14, border: `1px solid ${c.border}` }}>
                  <span style={{ fontSize: '1.5rem' }}>{b.icon}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: c.text, textAlign: 'center' }}>{b.text}</span>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES OVERVIEW ══════════════════════════════════════════════ */}
      <section className="pub-section" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6366f1', marginBottom: '0.75rem' }}>Everything you need</p>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', lineHeight: 1.12 }}>
              Built for every part of your business
            </h2>
            <p style={{ marginTop: '1rem', fontSize: '1rem', color: c.textDim, maxWidth: 520, margin: '1rem auto 0', lineHeight: 1.7 }}>
              From the storefront to the back office — one connected system handles it all.
            </p>
          </Fade>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {ALL_FEATURES.slice(0, 6).map((f, i) => {
              const Icon = f.icon;
              return (
                <Fade key={f.title} delay={i * 70}>
                  <div className="pub-card" style={{ padding: '1.75rem', height: '100%' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: `rgba(${f.rgb},0.1)`, border: `1px solid rgba(${f.rgb},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                      <Icon style={{ width: 22, height: 22, color: f.color }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: c.heading, marginBottom: '0.5rem' }}>{f.title}</h3>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: c.textDim }}>{f.desc}</p>
                  </div>
                </Fade>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ POS SHOWCASE ════════════════════════════════════════════════════ */}
      <section className="pub-section-alt" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>

            {/* Text side */}
            <Fade className="pub-showcase-text" style={{ flex: '1 1 340px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', borderRadius: 999, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1.25rem' }}>
                <BoltIcon style={{ width: 13, height: 13 }} /> POS &amp; Billing
              </span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1rem', lineHeight: 1.15 }}>
                Blazing fast Point of Sale
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, color: c.textDim, marginBottom: '1.75rem' }}>
                Process transactions in seconds. Search products, apply discounts, manage cart quantities, choose payment methods and print receipts — all from one clean screen.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                {['Barcode & name product search','Multiple payment methods (Cash, Card, Account)','Discount & tax management','Instant thermal receipt printing','Hold & resume transactions'].map(pt => (
                  <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: c.textSub }}>
                    <span style={{ width: 19, height: 19, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckIcon style={{ width: 10, height: 10, color: '#3b82f6' }} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="pub-gradient-btn pub-btn-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', borderRadius: 50, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
                Try the POS <ArrowRightIcon style={{ width: 16, height: 16 }} />
              </Link>
            </Fade>

            {/* Mockup side */}
            <Fade className="pub-showcase-mockup" delay={120} style={{ flex: '1 1 480px' }}>
              <BrowserFrame url="app.probusinesscloud.com/pos">
                <POSPreview />
              </BrowserFrame>
            </Fade>

          </div>
        </div>
      </section>

      {/* ═══ ALL FEATURES GRID ══════════════════════════════════════════════ */}
      <section style={{ padding: '6rem 1.5rem', background: isDark ? '#0d1525' : '#f0f4ff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#6366f1', marginBottom: '0.75rem' }}>Complete feature set</p>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em' }}>
              One platform, every tool you need
            </h2>
            <p style={{ marginTop: '1rem', fontSize: '1rem', color: c.textDim, maxWidth: 520, margin: '1rem auto 0', lineHeight: 1.7 }}>
              ProBusinessCloud includes every feature your business needs — no plugins, no extras, everything included.
            </p>
          </Fade>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {ALL_FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Fade key={f.title} delay={i * 55}>
                  <div className="pub-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: `rgba(${f.rgb},0.1)`, border: `1px solid rgba(${f.rgb},0.18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 19, height: 19, color: f.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: c.heading, marginBottom: '0.375rem' }}>{f.title}</h3>
                      <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: c.textDim }}>{f.desc}</p>
                    </div>
                  </div>
                </Fade>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ ROLES & PERMISSIONS ════════════════════════════════════════════ */}
      <section className="pub-section" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap', flexDirection: 'row-reverse' }}>

            {/* Text side */}
            <Fade style={{ flex: '1 1 320px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', borderRadius: 999, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '1.25rem' }}>
                <ShieldCheckIcon style={{ width: 13, height: 13 }} /> Roles &amp; Permissions
              </span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1rem', lineHeight: 1.15 }}>
                Granular access control for every role
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, color: c.textDim, marginBottom: '1.75rem' }}>
                Define exactly what each team member can access. Admins get full control, managers see reports, cashiers only see the POS. Create unlimited custom roles to fit your structure.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {['Admin, manager, cashier built-in roles','Module-level permission control','Create & edit action restrictions','Role-based navigation & views','Instant permission updates, no restart needed'].map(pt => (
                  <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: c.textSub }}>
                    <span style={{ width: 19, height: 19, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckIcon style={{ width: 10, height: 10, color: '#8b5cf6' }} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </Fade>

            {/* Role cards */}
            <Fade delay={100} style={{ flex: '1 1 440px' }}>
              <div className="pub-roles-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {ROLES.map((role, i) => (
                  <div key={role.title} style={{ background: c.bgCard, border: `1px solid ${role.border}`, borderRadius: 16, padding: '1.25rem', transition: 'transform 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        {role.icon}
                      </div>
                      <span style={{ fontWeight: 700, color: c.heading, fontSize: '0.925rem' }}>{role.title}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: c.textDim, marginBottom: '0.875rem' }}>{role.desc}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {role.features.map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: c.textSub }}>
                          <CheckIcon style={{ width: 10, height: 10, color: role.color, flexShrink: 0 }} />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Fade>

          </div>
        </div>
      </section>

      {/* ═══ ANALYTICS / REPORTS SECTION ════════════════════════════════════ */}
      <section className="pub-section-alt" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>

            {/* Text side */}
            <Fade className="pub-showcase-text" style={{ flex: '1 1 340px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#10b981', marginBottom: '1.25rem' }}>
                <ChartBarIcon style={{ width: 13, height: 13 }} /> Analytics &amp; Reports
              </span>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1rem', lineHeight: 1.15 }}>
                Insights that drive growth
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, color: c.textDim, marginBottom: '1.75rem' }}>
                Comprehensive business intelligence built in. Track revenue trends, identify top-selling products, analyze expenses and get a clear picture of your business performance.
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                {['Daily, weekly, monthly & yearly reports','Revenue vs. expense comparison charts','Top products & category analysis','Customer & supplier reporting','Profit & loss overview','Exportable data for deeper analysis'].map(pt => (
                  <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: c.textSub }}>
                    <span style={{ width: 19, height: 19, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckIcon style={{ width: 10, height: 10, color: '#10b981' }} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </Fade>

            {/* Analytics mockup */}
            <Fade className="pub-showcase-mockup" delay={120} style={{ flex: '1 1 480px' }}>
              <BrowserFrame url="app.probusinesscloud.com/reports">
                <AnalyticsPreview />
              </BrowserFrame>
            </Fade>

          </div>
        </div>
      </section>

      {/* ═══ STATS / SOCIAL PROOF ═══════════════════════════════════════════ */}
      <section style={{ padding: '5rem 1.5rem', background: isDark ? 'linear-gradient(135deg,#0c1427,#0e1635)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>
              Numbers that speak for themselves
            </h2>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.75rem' }}>Growing with businesses across Pakistan</p>
          </Fade>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem' }}>
            {[
              { value: '500+',  label: 'Businesses Powered', icon: '🏪' },
              { value: '99.9%', label: 'Uptime Reliability',  icon: '⚡' },
              { value: '12+',   label: 'Core Modules',        icon: '🧩' },
              { value: '24/7',  label: 'Cloud Access',        icon: '☁️' },
            ].map((s, i) => (
              <Fade key={s.label} delay={i * 80} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
                <div style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem', fontWeight: 500 }}>{s.label}</div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MOBILE / RESPONSIVE ════════════════════════════════════════════ */}
      <section className="pub-section" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <Fade>
            <div style={{ width: 70, height: 70, borderRadius: 20, background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <DevicePhoneMobileIcon style={{ width: 32, height: 32, color: '#6366f1' }} />
            </div>
            <h2 style={{ fontSize: 'clamp(1.85rem, 4vw, 2.85rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Works anywhere, on any device
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: c.textDim, maxWidth: 640, margin: '0 auto 2.5rem' }}>
              Access your entire business from any browser — desktop, tablet or smartphone. No installation required. ProBusinessCloud works seamlessly across every screen size.
            </p>
            <div className="pub-device-cards" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              {[
                { label: 'Desktop', icon: '🖥️',  desc: 'Full dashboard experience' },
                { label: 'Tablet',  icon: '📱',  desc: 'POS optimized for touch' },
                { label: 'Mobile',  icon: '📲',  desc: 'Reports on the go'        },
              ].map(d => (
                <div key={d.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: '1.25rem 2rem', textAlign: 'center', minWidth: 150 }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.625rem' }}>{d.icon}</div>
                  <div style={{ fontWeight: 700, color: c.heading, marginBottom: '0.25rem' }}>{d.label}</div>
                  <div style={{ fontSize: '0.8rem', color: c.textDim }}>{d.desc}</div>
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* ═══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <section style={{ padding: '7rem 1.5rem', background: isDark ? '#050912' : '#1e1b4b', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <Fade style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: '2rem' }}>
            <SparklesIcon style={{ width: 13, height: 13, color: '#fbbf24' }} /> Start managing your business smarter
          </span>
          <h2 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: '1.5rem' }}>
            Ready to transform your business?
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: 1.75, color: 'rgba(255,255,255,0.65)', marginBottom: '2.75rem', maxWidth: 520, margin: '0 auto 2.75rem' }}>
            Join hundreds of businesses already using ProBusinessCloud to streamline their operations, track inventory and grow faster.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', borderRadius: 50, fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none', background: 'white', color: '#4f46e5', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', transition: 'all 0.2s' }}>
              {isAuth ? 'Go to Dashboard' : 'Get Started Free'}
              <ArrowRightIcon style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.5rem', borderRadius: 50, fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}>
              Contact Sales
            </Link>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
            No credit card required &nbsp;·&nbsp; No setup fee &nbsp;·&nbsp; Ready in minutes
          </p>
        </Fade>
      </section>

    </div>
  );
}
