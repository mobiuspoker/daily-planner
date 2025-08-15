export type RecurrenceCadence = 'WEEKLY' | 'MONTHLY';

export interface RecurringRule {
  id: string;
  title: string;
  notes?: string;
  cadenceType: RecurrenceCadence;
  weekdaysMask?: number;  // Bitmask: Mon=1<<0, Tue=1<<1, ..., Sun=1<<6
  monthlyDay?: number;    // 1-28 or -1 for last day of month
  timeHHmm?: string;      // 'HH:mm' format or undefined for no time
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringRuleInput {
  title: string;
  notes?: string;
  cadenceType: RecurrenceCadence;
  weekdaysMask?: number;
  monthlyDay?: number;
  timeHHmm?: string;
  enabled?: boolean;
}

export interface UpdateRecurringRuleInput {
  title?: string;
  notes?: string;
  cadenceType?: RecurrenceCadence;
  weekdaysMask?: number;
  monthlyDay?: number;
  timeHHmm?: string;
  enabled?: boolean;
}