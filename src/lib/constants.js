// Central contract: enums, labels, and shared constants used across all modules.
// Every page/component should import from here instead of redefining status lists.

export const JOB_STATUSES = [
  'intake',
  'awaiting_diagnosis',
  'diagnosis_complete',
  'awaiting_approval',
  'approved',
  'in_progress',
  'waiting_for_parts',
  'quality_check',
  'ready_for_pickup',
  'completed',
  'cancelled',
];

export const JOB_STATUS_LABELS = {
  intake: 'Intake',
  awaiting_diagnosis: 'Awaiting Diagnosis',
  diagnosis_complete: 'Diagnosis Complete',
  awaiting_approval: 'Awaiting Approval',
  approved: 'Approved',
  in_progress: 'In Progress',
  waiting_for_parts: 'Waiting for Parts',
  quality_check: 'Quality Check',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Badge color classes per job status (Tailwind classes)
export const JOB_STATUS_COLORS = {
  intake: 'bg-slate-700/50 text-slate-300 border-slate-600',
  awaiting_diagnosis: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  diagnosis_complete: 'bg-amber-900/40 text-amber-300 border-amber-800',
  awaiting_approval: 'bg-orange-900/40 text-orange-300 border-orange-800',
  approved: 'bg-blue-900/40 text-blue-300 border-blue-800',
  in_progress: 'bg-cyan-900/40 text-cyan-300 border-cyan-800',
  waiting_for_parts: 'bg-purple-900/40 text-purple-300 border-purple-800',
  quality_check: 'bg-teal-900/40 text-teal-300 border-teal-800',
  ready_for_pickup: 'bg-green-900/40 text-green-300 border-green-800',
  completed: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
  cancelled: 'bg-red-900/40 text-red-300 border-red-800',
};

export const JOB_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_COLORS = {
  low: 'bg-slate-700/50 text-slate-300 border-slate-600',
  normal: 'bg-blue-900/40 text-blue-300 border-blue-800',
  high: 'bg-orange-900/40 text-orange-300 border-orange-800',
  urgent: 'bg-red-900/40 text-red-200 border-red-700',
};

export const POSITIONS = [
  'admin',
  'manager',
  'service_advisor',
  'mechanic',
  'parts_specialist',
  'customer',
];

export const POSITION_LABELS = {
  admin: 'Administrator',
  manager: 'Manager',
  service_advisor: 'Service Advisor',
  mechanic: 'Mechanic',
  parts_specialist: 'Parts Specialist',
  customer: 'Customer',
};

// Positions allowed to create/edit jobs, quotes, invoices
export const BILLING_POSITIONS = ['admin', 'manager', 'service_advisor'];
// Positions that count as shop staff (assignable to jobs)
export const STAFF_POSITIONS = ['admin', 'manager', 'service_advisor', 'mechanic', 'parts_specialist'];

export const VEHICLE_STATUSES = {
  checked_in: { label: 'Checked In', color: 'bg-cyan-900/40 text-cyan-300 border-cyan-800' },
  in_service: { label: 'In Service', color: 'bg-blue-900/40 text-blue-300 border-blue-800' },
  ready: { label: 'Ready', color: 'bg-green-900/40 text-green-300 border-green-800' },
  picked_up: { label: 'Picked Up', color: 'bg-slate-700/50 text-slate-300 border-slate-600' },
};

export const INVENTORY_CATEGORIES = [
  'engine', 'transmission', 'brakes', 'suspension', 'electrical',
  'cooling', 'fuel', 'exhaust', 'body', 'fluids', 'filters', 'belts_hoses', 'other',
];

export const INSPECTION_CATEGORIES = [
  'engine', 'transmission', 'brakes', 'suspension', 'electrical',
  'cooling', 'fuel', 'exhaust', 'tires', 'body', 'interior', 'fluids',
];

export const INSPECTION_ITEM_STATUSES = {
  ok: { label: 'OK', color: 'bg-green-900/40 text-green-300 border-green-800' },
  attention: { label: 'Needs Attention', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-800' },
  failed: { label: 'Failed', color: 'bg-red-900/40 text-red-300 border-red-800' },
  na: { label: 'N/A', color: 'bg-slate-700/50 text-slate-400 border-slate-600' },
};

export const INSPECTION_OVERALL_STATUSES = ['ok', 'attention_required', 'failed'];

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired', 'converted'];
export const QUOTE_STATUS_LABELS = {
  draft: 'Draft', sent: 'Sent', accepted: 'Accepted',
  declined: 'Declined', expired: 'Expired', converted: 'Converted',
};
export const QUOTE_STATUS_COLORS = {
  draft: 'bg-slate-700/50 text-slate-300 border-slate-600',
  sent: 'bg-blue-900/40 text-blue-300 border-blue-800',
  accepted: 'bg-green-900/40 text-green-300 border-green-800',
  declined: 'bg-red-900/40 text-red-300 border-red-800',
  expired: 'bg-yellow-900/40 text-yellow-300 border-yellow-800',
  converted: 'bg-emerald-900/40 text-emerald-300 border-emerald-800',
};

export const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'other'];
export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash', credit_card: 'Credit Card', debit_card: 'Debit Card',
  check: 'Check', bank_transfer: 'Bank Transfer', other: 'Other',
};

export const TAX_RATE_DEFAULT = 0.0825; // fallback; overridable in shop settings

export const NOTIFICATION_TYPES = {
  job_assigned: { label: 'Job Assigned', icon: 'Wrench' },
  quote_ready: { label: 'Quote Ready', icon: 'FileText' },
  invoice_due: { label: 'Invoice Due', icon: 'Receipt' },
  low_stock: { label: 'Low Stock', icon: 'Package' },
  appointment: { label: 'Appointment', icon: 'CalendarDays' },
  message: { label: 'Message', icon: 'MessageSquare' },
  achievement: { label: 'Achievement', icon: 'Award' },
};

export const ACHIEVEMENTS = [
  { id: 'first_job', name: 'First Blood', description: 'Complete your first job', icon: '🩸' },
  { id: 'jobs_10', name: 'Getting Greasy', description: 'Complete 10 jobs', icon: '🔧' },
  { id: 'jobs_50', name: 'Shop Veteran', description: 'Complete 50 jobs', icon: '🏅' },
  { id: 'revenue_10k', name: 'Five Figures', description: 'Generate $10,000 in completed revenue', icon: '💰' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Complete a job ahead of its promised date', icon: '⚡' },
  { id: 'perfect_inspection', name: 'Eagle Eye', description: 'Pass an inspection with zero flagged items', icon: '🔍' },
];
