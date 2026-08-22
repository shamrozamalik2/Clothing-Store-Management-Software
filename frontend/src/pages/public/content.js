import {
  ShoppingCartIcon, CubeIcon, TruckIcon, UsersIcon,
  BanknotesIcon, IdentificationIcon, WrenchScrewdriverIcon, ShieldCheckIcon,
  BuildingStorefrontIcon, BuildingOffice2Icon, GlobeAltIcon, ScissorsIcon,
  KeyIcon, LockClosedIcon, DocumentMagnifyingGlassIcon, ArrowPathRoundedSquareIcon,
  Square3Stack3DIcon, ClockIcon,
} from '@heroicons/react/24/outline';

/* ═══════════════════════════════════════════════════════════════════════════
   Site content
   Sourced from the ProBusinessCloud product brief. Capabilities beyond that
   brief are deliberately not claimed anywhere on this site.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── The four-part story the whole site tells ─────────────────────────────── */
export const STORY = [
  { k: 'sell',  title: 'Run the sale',            desc: 'A counter that keeps up with the queue.' },
  { k: 'stock', title: 'Control the stock',       desc: 'Every variant and movement accounted for.' },
  { k: 'know',  title: 'Understand the business', desc: 'Revenue, profit and cash, without a spreadsheet.' },
  { k: 'scale', title: 'Scale with confidence',   desc: 'Permissions, audit trails and backups as you grow.' },
];

/* ── Outcome-led capability groups ────────────────────────────────────────── */
export const GROUPS = [
  {
    id: 'sell',
    icon: ShoppingCartIcon,
    title: 'Sell faster at the counter',
    lede: 'A point of sale built for a real shop floor — barcode in, receipt out, without hunting through menus.',
    points: [
      'Barcode and product search with size and colour variants',
      'Discounts, tax, multiple payment methods and split tender',
      'Cart holds for customers who step away mid-sale',
      'Live stock visibility while ringing up',
      'Permission-controlled voids and price overrides',
      'Printed and Bluetooth receipts',
    ],
    preview: 'pos',
  },
  {
    id: 'stock',
    icon: CubeIcon,
    title: 'Keep every variant and movement visible',
    lede: 'Apparel lives and dies by variants. Track each size and colour as its own stock line, not a guess.',
    points: [
      'SKU, barcode and images per product',
      'Cost, sale and wholesale pricing',
      'Low-stock thresholds with dashboard alerts',
      'Stock adjustments with a recorded reason',
      'Categories and brands',
      'CSV import for bulk catalogue loading',
    ],
    preview: 'inventory',
  },
  {
    id: 'buy',
    icon: TruckIcon,
    title: 'Buy smarter, and know what you owe',
    lede: 'Purchase orders, receiving and supplier balances in one place, so payables never live in a notebook.',
    points: [
      'Purchase orders and receiving workflows',
      'Partial payments and outstanding due amounts',
      'Supplier directory with running balances',
      'Stock updated automatically on receipt',
      'Supplier ledgers and accounts payable',
    ],
    preview: 'inventory',
  },
  {
    id: 'customers',
    icon: UsersIcon,
    title: 'Build stronger customer relationships',
    lede: 'Know who buys what, who owes you, and who is worth keeping close.',
    points: [
      'Customer profiles with full purchase history',
      'Customer groups and credit limits',
      'Loyalty points',
      'Accounts receivable and customer ledgers',
      'Quick-add customers without leaving the POS',
    ],
    preview: 'dashboard',
  },
  {
    id: 'money',
    icon: BanknotesIcon,
    title: 'Understand revenue, profit and cash',
    lede: 'Dashboard KPIs and reports that answer the questions an owner actually asks.',
    points: [
      'Sales charts and payment breakdowns',
      'Top products and top customers',
      'Stock valuation',
      'Expenses, including recurring expenses',
      'Exportable reports for deeper analysis',
    ],
    preview: 'reports',
  },
  {
    id: 'people',
    icon: IdentificationIcon,
    title: 'Manage people, payroll and attendance',
    lede: 'Staff records, hours and pay handled inside the same system that runs the shop.',
    points: [
      'Employee records',
      'Payroll processing',
      'Attendance tracking',
      'Role-based access per employee',
    ],
    preview: 'dashboard',
  },
  {
    id: 'make',
    icon: WrenchScrewdriverIcon,
    title: 'Turn raw materials into finished products',
    lede: 'For businesses that manufacture as well as sell — production tracked against real material consumption.',
    points: [
      'Bills of materials',
      'Production batches',
      'Raw-material consumption',
      'Finished goods back into sellable stock',
    ],
    preview: 'inventory',
  },
  {
    id: 'control',
    icon: ShieldCheckIcon,
    title: 'Control access, backups and operations',
    lede: 'The administrative layer that makes the system safe to hand to a team.',
    points: [
      'Role-based permissions across every module',
      'Audit trail of administrative activity',
      'Data backup and restore',
      'Company settings',
      'Multi-company administration via a separate super-admin panel',
    ],
    preview: 'dashboard',
  },
];

/* ── How it works ─────────────────────────────────────────────────────────── */
export const STEPS = [
  {
    n: '01',
    title: 'Configure the business',
    desc: 'Load your catalogue with variants and pricing, set categories and brands, add your team, and define what each role can reach. CSV import handles an existing catalogue in bulk.',
    preview: 'inventory',
  },
  {
    n: '02',
    title: 'Sell and receive stock',
    desc: 'Staff ring up sales at the counter while purchase orders bring new stock in. Both sides adjust inventory as they happen, so the number on screen is the number on the shelf.',
    preview: 'pos',
  },
  {
    n: '03',
    title: 'Monitor performance',
    desc: 'Dashboard KPIs, sales charts, payment breakdowns and stock valuation show what is selling, what is stuck, and where the margin actually sits.',
    preview: 'dashboard',
  },
  {
    n: '04',
    title: 'Grow with control',
    desc: 'Add locations and staff behind role-based permissions, keep an audit trail of administrative activity, and protect the record with backup and restore.',
    preview: 'reports',
  },
];

/* ── Solutions ────────────────────────────────────────────────────────────── */
export const SOLUTIONS = [
  {
    id: 'independent',
    icon: BuildingStorefrontIcon,
    who: 'Independent clothing stores',
    problem: 'Sales live in one system, stock in a spreadsheet, and payables in a notebook — so nothing reconciles at month end.',
    answer: 'One system records the sale, moves the stock and posts to the ledger in the same action. The day closes with numbers that already agree.',
    points: ['POS with variant support', 'Live stock levels', 'Expenses and ledgers', 'Daily revenue and profit'],
  },
  {
    id: 'multi',
    icon: BuildingOffice2Icon,
    who: 'Multi-branch retailers',
    problem: 'Each branch keeps its own records, and head office only finds out what happened weeks later.',
    answer: 'Company-wide records with role-based access, so branch staff see their work and owners see everything — on web, desktop or phone.',
    points: ['Role-based permissions', 'Company-wide reporting', 'Audit trail', 'Mobile access for owners'],
  },
  {
    id: 'wholesale',
    icon: GlobeAltIcon,
    who: 'Wholesalers',
    problem: 'Trade customers buy on credit, and exposure is invisible until someone stops paying.',
    answer: 'Wholesale pricing, credit limits and customer ledgers make receivables visible while the order is still being written.',
    points: ['Wholesale price tier', 'Credit limits', 'Accounts receivable', 'Customer groups'],
  },
  {
    id: 'manufacture',
    icon: ScissorsIcon,
    who: 'Apparel manufacturers',
    problem: 'Production is tracked apart from sales, so material cost and finished stock never line up.',
    answer: 'Bills of materials and production batches consume raw materials and return finished goods to sellable stock in the same system that sells them.',
    points: ['Bills of materials', 'Production batches', 'Raw-material consumption', 'Finished goods to stock'],
  },
];

/* ── Security and control ─────────────────────────────────────────────────── */
export const SECURITY = [
  {
    icon: KeyIcon,
    title: 'Multi-tenant authentication',
    desc: 'Each company signs in against its own account space. Company records stay separated at the data layer.',
  },
  {
    icon: LockClosedIcon,
    title: 'Role-based permissions',
    desc: 'Access is granted per module and per action. A cashier sees the counter; an owner sees the business.',
  },
  {
    icon: ClockIcon,
    title: 'Refresh-token sessions',
    desc: 'Sessions renew in the background and end cleanly, so staff are not logged out mid-sale or left signed in for ever.',
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'Audit trail',
    desc: 'Administrative activity is recorded, so sensitive actions can be reviewed after the fact.',
  },
  {
    icon: ArrowPathRoundedSquareIcon,
    title: 'Backup and restore',
    desc: 'Take a snapshot of the business record and restore it deliberately, with confirmation before anything is overwritten.',
  },
  {
    icon: Square3Stack3DIcon,
    title: 'Super-admin separation',
    desc: 'Company administration lives in its own panel behind its own credentials, apart from day-to-day retail use.',
  },
];

/* ── Platform surfaces ────────────────────────────────────────────────────── */
export const SURFACES = [
  {
    id: 'web',
    label: 'Web',
    title: 'The full workspace, in the browser',
    desc: 'Every module — POS, inventory, purchasing, customers, finance, staff, production and reporting — with nothing to install.',
    points: ['All modules available', 'Works on any modern browser', 'Role-aware navigation'],
  },
  {
    id: 'desktop',
    label: 'Desktop',
    title: 'A dedicated counter application',
    desc: 'A desktop build for the till itself, so the shop floor gets a focused window rather than a browser tab among many.',
    points: ['Installed application', 'Built for the counter', 'Receipt printing'],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    title: 'The business in your pocket',
    desc: 'Android and iOS apps for owners and managers — check the day, look up a product, review a sale, respond to what needs attention.',
    points: ['Android and iOS', 'Dashboard, POS and product search', 'Customers, sales history and reports', 'Push notifications'],
  },
];

/* ── Business types for the demo form ─────────────────────────────────────── */
export const BUSINESS_TYPES = [
  'Independent clothing store',
  'Multi-branch retailer',
  'Wholesaler',
  'Apparel manufacturer',
  'Other retail business',
];

export const LOCATION_COUNTS = ['1', '2–5', '6–20', '20+'];
