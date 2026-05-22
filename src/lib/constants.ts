export const appointmentStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Scheduled', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  arrived: { label: 'Arrived', variant: 'default' },
  no_show: { label: 'No Show', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'outline' },
};

export const visitStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  waiting: { label: 'Waiting', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export const paymentStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  refunded: { label: 'Refunded', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export const paymentTypeLabels: Record<string, string> = {
  consultation: 'Consultation',
  medication: 'Medication',
  follow_up: 'Follow Up',
  other: 'Other',
};

export const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
};

export const statusColorMap: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  confirmed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  arrived: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
  no_show: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
};

export const appointmentStatuses = ['scheduled', 'confirmed', 'arrived', 'no_show', 'cancelled', 'completed'];
export const visitStatuses = ['waiting', 'in_progress', 'completed', 'cancelled'];
export const paymentTypes = ['consultation', 'medication', 'follow_up', 'other'];
export const paymentMethods = ['cash', 'card', 'other'];
