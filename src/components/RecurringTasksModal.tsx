import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, Clock, Calendar, CalendarDays } from 'lucide-react';
import { 
  listRules, 
  createRule, 
  updateRule, 
  deleteRule 
} from '../services/recurringTaskService';
import { RecurringRule, RecurrenceCadence } from '../types/recurring';
import { CustomDropdown } from './CustomDropdown';
import './RecurringTasksModal.css';

interface RecurringTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RuleFormData {
  title: string;
  cadenceType: RecurrenceCadence;
  weekdays: boolean[];
  monthlyDay: number;
  timeHHmm: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function RecurringTasksModal({ isOpen, onClose }: RecurringTasksModalProps) {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    title: '',
    cadenceType: 'WEEKLY',
    weekdays: [true, true, true, true, true, false, false], // Mon-Fri default
    monthlyDay: 1,
    timeHHmm: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditing) {
          cancelEdit();
        } else {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isEditing, onClose]);

  const loadRules = async () => {
    try {
      const loadedRules = await listRules();
      setRules(loadedRules);
    } catch (error) {
      console.error('Failed to load recurring rules:', error);
    }
  };

  const weekdaysToMask = (weekdays: boolean[]): number => {
    let mask = 0;
    weekdays.forEach((enabled, index) => {
      if (enabled) mask |= (1 << index);
    });
    return mask;
  };

  const maskToWeekdays = (mask: number | undefined): boolean[] => {
    if (mask === undefined || mask === null) return Array(7).fill(false);
    return Array(7).fill(false).map((_, index) => (mask & (1 << index)) !== 0);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    
    setIsLoading(true);
    try {
      if (editingId) {
        await updateRule(editingId, {
          title: formData.title,
          cadenceType: formData.cadenceType,
          weekdaysMask: formData.cadenceType === 'WEEKLY' ? weekdaysToMask(formData.weekdays) : undefined,
          monthlyDay: formData.cadenceType === 'MONTHLY' ? formData.monthlyDay : undefined,
          timeHHmm: formData.timeHHmm || undefined
        });
      } else {
        await createRule({
          title: formData.title,
          cadenceType: formData.cadenceType,
          weekdaysMask: formData.cadenceType === 'WEEKLY' ? weekdaysToMask(formData.weekdays) : undefined,
          monthlyDay: formData.cadenceType === 'MONTHLY' ? formData.monthlyDay : undefined,
          timeHHmm: formData.timeHHmm || undefined,
          enabled: true
        });
      }
      
      await loadRules();
      cancelEdit();
    } catch (error) {
      console.error('Failed to save rule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (rule: RecurringRule) => {
    setFormData({
      title: rule.title,
      cadenceType: rule.cadenceType,
      weekdays: maskToWeekdays(rule.weekdaysMask),
      monthlyDay: rule.monthlyDay || 1,
      timeHHmm: rule.timeHHmm || ''
    });
    setEditingId(rule.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recurring task?')) return;
    
    try {
      await deleteRule(id);
      await loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleToggleEnabled = async (rule: RecurringRule) => {
    try {
      await updateRule(rule.id, { enabled: !rule.enabled });
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      title: '',
      cadenceType: 'WEEKLY',
      weekdays: [true, true, true, true, true, false, false],
      monthlyDay: 1,
      timeHHmm: ''
    });
  };

  const formatCadence = (rule: RecurringRule): string => {
    if (rule.cadenceType === 'WEEKLY') {
      const days = maskToWeekdays(rule.weekdaysMask)
        .map((enabled, i) => enabled ? WEEKDAY_LABELS[i] : null)
        .filter(Boolean)
        .join(', ');
      return days || 'No days selected';
    } else {
      if (rule.monthlyDay === -1) return 'Last day of month';
      const day = rule.monthlyDay || 1;
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      return `${day}${suffix} of each month`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recurring-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Recurring Tasks</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {!isEditing ? (
            <>
              <div className="recurring-rules-list">
                {rules.length === 0 ? (
                  <div className="empty-state">
                    <p>No recurring tasks yet</p>
                    <p className="empty-hint">Add tasks that repeat on specific days</p>
                  </div>
                ) : (
                  rules.map(rule => (
                    <div key={rule.id} className={`recurring-rule-item ${!rule.enabled ? 'disabled' : ''}`}>
                      <div className="rule-main">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleEnabled(rule)}
                          className="rule-checkbox"
                        />
                        <div className="rule-info">
                          <div className="rule-title">{rule.title}</div>
                          <div className="rule-meta">
                            {rule.cadenceType === 'WEEKLY' ? (
                              <CalendarDays size={14} />
                            ) : (
                              <Calendar size={14} />
                            )}
                            <span>{formatCadence(rule)}</span>
                            {rule.timeHHmm && (
                              <>
                                <Clock size={14} />
                                <span>{rule.timeHHmm}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="rule-actions">
                        <button
                          className="icon-button"
                          onClick={() => handleEdit(rule)}
                          aria-label="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => handleDelete(rule.id)}
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                className="add-recurring-button"
                onClick={() => setIsEditing(true)}
              >
                <Plus size={18} />
                Add Recurring Task
              </button>
            </>
          ) : (
            <div className="recurring-form">
              <div className="form-group">
                <label htmlFor="task-title">Title</label>
                <input
                  id="task-title"
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Morning workout"
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Repeat</label>
                <div className="cadence-tabs">
                  <button
                    className={`cadence-tab ${formData.cadenceType === 'WEEKLY' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, cadenceType: 'WEEKLY' })}
                  >
                    Weekly
                  </button>
                  <button
                    className={`cadence-tab ${formData.cadenceType === 'MONTHLY' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, cadenceType: 'MONTHLY' })}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {formData.cadenceType === 'WEEKLY' ? (
                <div className="form-group">
                  <label>Days</label>
                  <div className="weekday-selector">
                    {WEEKDAY_LABELS.map((day, index) => (
                      <button
                        key={day}
                        className={`weekday-button ${formData.weekdays[index] ? 'selected' : ''}`}
                        onClick={() => {
                          const newWeekdays = [...formData.weekdays];
                          newWeekdays[index] = !newWeekdays[index];
                          setFormData({ ...formData, weekdays: newWeekdays });
                        }}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="monthly-day">Day of Month</label>
                  <CustomDropdown
                    id="monthly-day"
                    value={formData.monthlyDay.toString()}
                    options={[
                      ...Array(28).fill(0).map((_, i) => ({
                        value: (i + 1).toString(),
                        label: `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`
                      })),
                      { value: '-1', label: 'Last day' }
                    ]}
                    onChange={value => setFormData({ ...formData, monthlyDay: parseInt(value.toString()) })}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="task-time">Time (optional)</label>
                <div className="time-input-wrapper">
                  <input
                    id="task-time"
                    type="time"
                    value={formData.timeHHmm}
                    onChange={e => setFormData({ ...formData, timeHHmm: e.target.value })}
                    className="form-input time-input"
                    placeholder="No time set"
                  />
                  {formData.timeHHmm && (
                    <button
                      type="button"
                      className="clear-time-button"
                      onClick={() => setFormData({ ...formData, timeHHmm: '' })}
                      aria-label="Clear time"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  className="button-secondary"
                  onClick={cancelEdit}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="button-primary"
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.title.trim()}
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}