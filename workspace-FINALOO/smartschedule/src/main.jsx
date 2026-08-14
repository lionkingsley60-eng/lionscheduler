import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Sparkles, CalendarDays, CheckSquare2, LayoutDashboard, Settings, Bell,
  ChevronLeft, ChevronRight, Plus, WandSparkles, Clock3, MoreHorizontal,
  BriefcaseBusiness, BookOpen, Dumbbell, Coffee, CircleCheck, X, Trash2,
  Pencil, RotateCcw, ArrowRight, SlidersHorizontal, Search, BrainCircuit,
  TimerReset, CalendarClock, GripVertical, Menu, SunMedium, Flag, Check,
  CircleAlert, ListFilter, UserRound, ChevronDown, PanelLeftClose,
  Mic, MicOff, Volume2, VolumeX, SendHorizontal, AudioLines,
  LockKeyhole, LogOut, Mail, Eye, EyeOff, ShieldCheck, KeyRound, UserPlus,
  Phone, MapPin, Globe2, Copy, Command, IdCard, Save, ExternalLink
} from 'lucide-react';
import './styles.css';
import { supabase, isSupabaseConfigured } from './supabase';

const pad = n => String(n).padStart(2, '0');
const ymd = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromYmd = value => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};
const mondayOf = date => {
  const copy = startOfDay(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
};
const isoAt = (date, time) => `${ymd(date)}T${time}:00`;
const timeToMinutes = time => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
const minutesToTime = minutes => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const round15 = minutes => Math.ceil(minutes / 15) * 15;
const formatTime = value => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const formatMinutes = mins => mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`;
const dayLabel = date => date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const shortDate = date => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
const parseVoiceClock = (text, words = 'at|by|from') => {
  if (new RegExp(`(?:${words})\\s+noon`, 'i').test(text)) return '12:00';
  if (new RegExp(`(?:${words})\\s+midnight`, 'i').test(text)) return '00:00';
  const match = text.match(new RegExp(`(?:${words})\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?`, 'i'));
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase().replaceAll('.', '');
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  return `${pad(Math.min(hour, 23))}:${pad(Math.min(minute, 59))}`;
};
const parseVoiceDuration = (text, fallback = 60) => {
  const match = text.match(/(?:for\s+)?(\d+(?:\.\d+)?)\s*(minute|minutes|mins|min|hour|hours|hr|hrs)/i);
  if (!match) return fallback;
  let value = Number(match[1]);
  if (/hour|hr/i.test(match[2])) value *= 60;
  return Math.min(480, Math.max(15, Math.round(value / 15) * 15));
};

const today = startOfDay(new Date());

function makeSeedData() {
  const d0 = today;
  const d1 = addDays(today, 1);
  const d2 = addDays(today, 2);
  const d4 = addDays(today, 4);
  return [
    { id: 'a0', kind: 'availability', title: 'Workday availability', date: ymd(d0), start: '08:00', end: '19:00' },
    { id: 'a1', kind: 'availability', title: 'Weekend availability', date: ymd(d1), start: '09:00', end: '17:30' },
    { id: 'a2', kind: 'availability', title: 'Weekend availability', date: ymd(d2), start: '10:00', end: '18:00' },
    { id: 'e1', kind: 'event', title: 'Team stand-up', category: 'Work', start: isoAt(d0, '10:15'), end: isoAt(d0, '10:45'), fixed: true },
    { id: 'e2', kind: 'event', title: 'Lunch & reset', category: 'Personal', start: isoAt(d0, '12:30'), end: isoAt(d0, '13:15'), fixed: true },
    { id: 'e3', kind: 'event', title: 'Client workshop', category: 'Work', start: isoAt(d0, '14:00'), end: isoAt(d0, '15:30'), fixed: true },
    { id: 'e4', kind: 'event', title: 'Gym session', category: 'Health', start: isoAt(d0, '17:30'), end: isoAt(d0, '18:30'), fixed: true },
    { id: 'e5', kind: 'event', title: 'Project check-in', category: 'Work', start: isoAt(d1, '11:00'), end: isoAt(d1, '11:45'), fixed: true },
    { id: 'e6', kind: 'event', title: 'Dentist appointment', category: 'Personal', start: isoAt(d4, '15:00'), end: isoAt(d4, '15:45'), fixed: true },
    { id: 't1', kind: 'task', title: 'Finish product proposal', category: 'Work', deadline: isoAt(d0, '17:00'), priority: 'High', duration: 90, preferred: 'Morning', scheduledStart: isoAt(d0, '08:30'), status: 'scheduled' },
    { id: 't2', kind: 'task', title: 'Research competitor notes', category: 'Study', deadline: isoAt(d1, '18:00'), priority: 'High', duration: 75, preferred: 'Morning', scheduledStart: isoAt(d0, '11:00'), status: 'scheduled' },
    { id: 't3', kind: 'task', title: 'Email & admin', category: 'Work', deadline: isoAt(d0, '18:30'), priority: 'Medium', duration: 45, preferred: 'Afternoon', scheduledStart: isoAt(d0, '15:45'), status: 'scheduled' },
    { id: 't4', kind: 'task', title: 'Review statistics chapter', category: 'Study', deadline: isoAt(d2, '20:00'), priority: 'Medium', duration: 60, preferred: 'Evening', scheduledStart: isoAt(d1, '15:00'), status: 'scheduled' },
    { id: 't5', kind: 'task', title: 'Prepare Monday presentation', category: 'Work', deadline: isoAt(d4, '09:00'), priority: 'High', duration: 120, preferred: 'Morning', scheduledStart: isoAt(d2, '10:30'), status: 'scheduled' },
    { id: 't6', kind: 'task', title: 'Order household supplies', category: 'Personal', deadline: isoAt(d2, '17:00'), priority: 'Low', duration: 30, preferred: 'Afternoon', scheduledStart: null, status: 'backlog' }
  ];
}

const categoryMeta = {
  Work: { icon: BriefcaseBusiness, color: '#6255d9', soft: '#eeecff' },
  Study: { icon: BookOpen, color: '#238d75', soft: '#e5f6f1' },
  Health: { icon: Dumbbell, color: '#d66a32', soft: '#fff0e8' },
  Personal: { icon: Coffee, color: '#b07c22', soft: '#fff6dd' }
};

function loadItems(userId = 'guest') {
  try {
    const saved = localStorage.getItem(`smartSchedule-items-v2-${userId}`) || (userId === 'demo-alex' ? localStorage.getItem('smartSchedule-items-v2') : null);
    return saved ? JSON.parse(saved) : makeSeedData();
  } catch {
    return makeSeedData();
  }
}

function priorityScore(priority) {
  return { High: 3, Medium: 2, Low: 1 }[priority] || 1;
}

function preferredWindow(preferred) {
  return {
    Morning: [8 * 60, 12 * 60],
    Afternoon: [12 * 60, 17 * 60 + 30],
    Evening: [17 * 60, 21 * 60],
    Anytime: [8 * 60, 20 * 60]
  }[preferred || 'Anytime'];
}

function findSlotForDay(items, date, duration, preferred = 'Anytime', ignoreId = null, workHours = null) {
  const key = ymd(date);
  const avail = items.filter(i => i.kind === 'availability' && i.date === key);
  const defaultWindow = workHours || [8 * 60, date.getDay() === 0 || date.getDay() === 6 ? 18 * 60 : 20 * 60];
  const windows = avail.length
    ? avail.map(a => [timeToMinutes(a.start), timeToMinutes(a.end)])
    : [defaultWindow];
  const occupied = items.filter(item => {
    if (item.id === ignoreId || item.status === 'done' || item.kind === 'availability') return false;
    const value = item.kind === 'event' ? item.start : item.scheduledStart;
    return value && value.slice(0, 10) === key;
  }).map(item => {
    const value = item.kind === 'event' ? item.start : item.scheduledStart;
    const start = timeToMinutes(value.slice(11, 16));
    const end = item.kind === 'event' ? timeToMinutes(item.end.slice(11, 16)) : start + item.duration;
    return { start, end };
  }).sort((a, b) => a.start - b.start);

  const preferredRange = preferredWindow(preferred);
  const passes = preferred === 'Anytime' ? [preferredRange] : [preferredRange, [8 * 60, 21 * 60]];
  for (const pass of passes) {
    for (const [windowStart, windowEnd] of windows) {
      const lower = Math.max(windowStart, pass[0]);
      const upper = Math.min(windowEnd, pass[1]);
      let candidate = round15(lower);
      while (candidate + duration <= upper) {
        const conflict = occupied.find(o => candidate < o.end + 15 && candidate + duration + 15 > o.start);
        if (!conflict) return minutesToTime(candidate);
        candidate = round15(conflict.end + 15);
      }
    }
  }
  return null;
}

function App({ user, onLogout, onUpdateUser }) {
  const [items, setItems] = useState(() => loadItems(user.id));
  const [dataReady, setDataReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState('connecting');
  const syncedIdsRef = useRef(new Set());
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState('day');
  const [page, setPage] = useState('plan');
  const [modal, setModal] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [taskFilter, setTaskFilter] = useState('All');
  const [reminderPanel, setReminderPanel] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem(`lion-reminders-enabled-${user.id}`) === 'true');
  const [dueAlert, setDueAlert] = useState(null);
  const [snoozes, setSnoozes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lion-reminder-snoozes-${user.id}`) || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      setSyncStatus('connecting');
      const { data, error } = await supabase.from('schedule_items').select('item_id, data').eq('user_id', user.id);
      if (cancelled) return;
      if (error) {
        console.error('Supabase schedule load failed:', error);
        setSyncStatus('error');
        setDataReady(true);
        return;
      }
      if (data?.length) {
        const cloudItems = data.map(row => row.data).filter(Boolean);
        syncedIdsRef.current = new Set(data.map(row => row.item_id));
        setItems(cloudItems);
        localStorage.setItem(`smartSchedule-items-v2-${user.id}`, JSON.stringify(cloudItems));
      } else {
        const seedItems = loadItems(user.id);
        const rows = seedItems.map(item => ({ user_id: user.id, item_id: item.id, kind: item.kind, data: item }));
        const result = await supabase.from('schedule_items').upsert(rows, { onConflict: 'user_id,item_id' });
        if (cancelled) return;
        if (result.error) {
          console.error('Supabase seed failed:', result.error);
          setSyncStatus('error');
        } else {
          syncedIdsRef.current = new Set(seedItems.map(item => item.id));
          setSyncStatus('saved');
        }
        setItems(seedItems);
      }
      setDataReady(true);
      setSyncStatus(current => current === 'error' ? current : 'saved');
    }
    loadSchedule();
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    localStorage.setItem(`smartSchedule-items-v2-${user.id}`, JSON.stringify(items));
    if (!dataReady) return;
    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      const rows = items.map(item => ({ user_id: user.id, item_id: item.id, kind: item.kind, data: item }));
      const currentIds = new Set(items.map(item => item.id));
      const removedIds = [...syncedIdsRef.current].filter(id => !currentIds.has(id));
      try {
        if (rows.length) {
          const { error } = await supabase.from('schedule_items').upsert(rows, { onConflict: 'user_id,item_id' });
          if (error) throw error;
        }
        if (removedIds.length) {
          const { error } = await supabase.from('schedule_items').delete().eq('user_id', user.id).in('item_id', removedIds);
          if (error) throw error;
        }
        syncedIdsRef.current = currentIds;
        setSyncStatus('saved');
      } catch (error) {
        console.error('Supabase schedule sync failed:', error);
        setSyncStatus('error');
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [items, user.id, dataReady]);

  useEffect(() => {
    localStorage.setItem(`lion-reminders-enabled-${user.id}`, String(remindersEnabled));
  }, [remindersEnabled, user.id]);

  useEffect(() => {
    localStorage.setItem(`lion-reminder-snoozes-${user.id}`, JSON.stringify(snoozes));
  }, [snoozes, user.id]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const weekStart = useMemo(() => mondayOf(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const tasks = items.filter(i => i.kind === 'task');
  const userWorkHours = [timeToMinutes(user.workStart || '08:00'), timeToMinutes(user.workEnd || '18:00')];
  const completedToday = tasks.filter(t => t.status === 'done' && t.completedAt?.slice(0, 10) === ymd(selectedDate)).length;
  const scheduledToday = tasks.filter(t => t.scheduledStart?.slice(0, 10) === ymd(selectedDate));
  const focusMins = scheduledToday.filter(t => t.status !== 'done').reduce((sum, t) => sum + t.duration, 0);
  const highDue = tasks.filter(t => t.status !== 'done' && t.priority === 'High').length;

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function reminderMessage(item, test = false) {
    const prefix = test ? 'This is a test reminder. ' : '';
    if (item.kind === 'event') {
      return `${prefix}It is time for ${item.title}. This appointment starts now and ends at ${formatTime(item.end)}.`;
    }
    const priority = item.priority === 'High' ? 'This is a high-priority task. ' : '';
    return `${prefix}It is time to work on ${item.title}. ${priority}You planned ${formatMinutes(item.duration)} for it. Open SmartSchedule to begin, complete it, or ask the assistant to move it.`;
  }

  function triggerReminder(item, test = false) {
    const message = reminderMessage(item, test);
    setDueAlert({ item, message, test });
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = .96;
      utterance.pitch = 1.02;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find(v => /en-GB|en_GB|English.*United Kingdom/i.test(`${v.lang} ${v.name}`)) || voices.find(v => v.lang?.startsWith('en')) || null;
      window.speechSynthesis.speak(utterance);
    }
    if (!test && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notification = new Notification(`LION · Time for ${item.title}`, {
          body: message.replace(/^It is time[^.]*\.\s*/, ''),
          tag: `lion-${item.id}`,
          renotify: true
        });
        notification.onclick = () => { window.focus(); notification.close(); };
      } catch { /* In-app reminder remains available in restricted previews. */ }
    }
  }

  async function enableReminders() {
    let permission = 'unsupported';
    try {
      if (typeof Notification !== 'undefined') {
        permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      }
    } catch {
      permission = 'blocked';
    }
    setRemindersEnabled(true);
    setReminderPanel(true);
    showToast(permission === 'denied' || permission === 'blocked' ? 'In-app voice reminders enabled; browser notifications are blocked' : 'LION reminders enabled');
  }

  function disableReminders() {
    setRemindersEnabled(false);
    setDueAlert(null);
    showToast('LION reminders paused', 'neutral');
  }

  function testReminder() {
    const upcoming = items
      .filter(item => item.kind !== 'availability' && item.status !== 'done')
      .map(item => ({ item, time: new Date(item.kind === 'event' ? item.start : item.scheduledStart || item.deadline).getTime() }))
      .filter(entry => Number.isFinite(entry.time))
      .sort((a, b) => a.time - b.time)
      .find(entry => entry.time >= Date.now())?.item;
    triggerReminder(upcoming || { id: 'test', kind: 'task', title: 'review your SmartSchedule plan', priority: 'Medium', duration: 15 }, true);
  }

  function snoozeReminder(item, minutes = 10) {
    setSnoozes(current => ({ ...current, [item.id]: Date.now() + minutes * 60000 }));
    setDueAlert(null);
    showToast(`Reminder snoozed for ${minutes} minutes`, 'neutral');
  }

  useEffect(() => {
    if (!remindersEnabled) return;
    const checkDueItems = () => {
      const now = Date.now();
      const candidate = items.find(item => {
        if (item.kind === 'availability' || item.status === 'done') return false;
        const normalTime = new Date(item.kind === 'event' ? item.start : item.scheduledStart || item.deadline).getTime();
        const snoozedTime = Number(snoozes[item.id] || 0);
        const dueTime = snoozedTime || normalTime;
        if (!Number.isFinite(dueTime) || now < dueTime || now - dueTime > 5 * 60000) return false;
        const key = `lion-reminded-${user.id}-${item.id}-${dueTime}`;
        if (localStorage.getItem(key)) return false;
        localStorage.setItem(key, 'true');
        return true;
      });
      if (candidate) {
        setSnoozes(current => {
          if (!current[candidate.id]) return current;
          const next = { ...current };
          delete next[candidate.id];
          return next;
        });
        triggerReminder(candidate);
      }
    };
    checkDueItems();
    const timer = setInterval(checkDueItems, 15000);
    return () => clearInterval(timer);
  }, [remindersEnabled, items, snoozes, user.id]);

  function navigatePage(next) {
    setPage(next);
    setMobileNav(false);
    if (next === 'calendar') setView('week');
    if (next === 'plan') setView('day');
  }

  function saveItem(data) {
    if (data.id) {
      setItems(current => current.map(item => item.id === data.id ? data : item));
      showToast('Changes saved to your schedule');
    } else {
      const newItem = { ...data, id: `${data.kind[0]}${Date.now()}` };
      if (newItem.kind === 'task') {
        const dueDate = fromYmd(newItem.deadline.slice(0, 10));
        const slot = findSlotForDay(items, dueDate, newItem.duration, newItem.preferred, null, userWorkHours);
        if (slot) {
          newItem.scheduledStart = isoAt(dueDate, slot);
          newItem.status = 'scheduled';
        } else {
          newItem.scheduledStart = null;
          newItem.status = 'backlog';
        }
      }
      setItems(current => [...current, newItem]);
      showToast(newItem.kind === 'task' && newItem.scheduledStart ? `Task added at ${formatTime(newItem.scheduledStart)}` : 'Added to SmartSchedule');
    }
    setModal(null);
  }

  function deleteItem(id) {
    setItems(current => current.filter(item => item.id !== id));
    setOpenMenu(null);
    setModal(null);
    showToast('Item removed', 'neutral');
  }

  function toggleTask(id) {
    setItems(current => current.map(item => {
      if (item.id !== id) return item;
      const done = item.status !== 'done';
      return { ...item, status: done ? 'done' : 'scheduled', completedAt: done ? new Date().toISOString() : null };
    }));
  }

  function suggestMove(task) {
    let chosen = null;
    for (let offset = 1; offset <= 7; offset++) {
      const date = addDays(selectedDate, offset);
      if (new Date(task.deadline) < date && offset > 1) break;
      const slot = findSlotForDay(items, date, task.duration, task.preferred, task.id, userWorkHours);
      if (slot) { chosen = { date, slot }; break; }
    }
    if (!chosen) {
      const date = addDays(selectedDate, 1);
      chosen = { date, slot: '08:00' };
    }
    setSuggestion({ task, ...chosen });
    setOpenMenu(null);
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    const scheduledStart = isoAt(suggestion.date, suggestion.slot);
    setItems(current => current.map(item => item.id === suggestion.task.id
      ? { ...item, scheduledStart, status: 'scheduled', completedAt: null }
      : item));
    setSuggestion(null);
    showToast(`Moved to ${shortDate(new Date(scheduledStart))} at ${formatTime(scheduledStart)}`);
  }

  function generateSchedule(mode = view) {
    setGenerating(true);
    setTimeout(() => {
      setItems(current => {
        let next = current.map(i => ({ ...i }));
        const dates = mode === 'week' ? weekDays : [selectedDate];
        const keys = new Set(dates.map(ymd));
        const candidates = next.filter(i => i.kind === 'task' && i.status !== 'done' &&
          ((!i.scheduledStart) || keys.has(i.scheduledStart.slice(0, 10))));
        next = next.map(i => i.kind === 'task' && candidates.some(c => c.id === i.id)
          ? { ...i, scheduledStart: null, status: 'backlog' }
          : i);
        candidates.sort((a, b) => {
          const urgency = new Date(a.deadline) - new Date(b.deadline);
          return urgency || priorityScore(b.priority) - priorityScore(a.priority);
        });
        for (const task of candidates) {
          const deadlineDay = startOfDay(new Date(task.deadline));
          const validDates = dates.filter(d => d <= deadlineDay || ymd(d) === ymd(deadlineDay));
          const searchDates = validDates.length ? validDates : dates;
          let placed = false;
          for (const date of searchDates) {
            const slot = findSlotForDay(next, date, task.duration, task.preferred, task.id, userWorkHours);
            if (slot) {
              next = next.map(i => i.id === task.id ? { ...i, scheduledStart: isoAt(date, slot), status: 'scheduled' } : i);
              placed = true;
              break;
            }
          }
          if (!placed) next = next.map(i => i.id === task.id ? { ...i, status: 'backlog' } : i);
        }
        return next;
      });
      setGenerating(false);
      showToast(`${mode === 'week' ? 'Week' : 'Day'} optimized — conflicts cleared and breaks added`);
    }, 850);
  }

  function resetDemo() {
    setItems(makeSeedData());
    setSelectedDate(today);
    setSuggestion(null);
    showToast('Demo schedule restored', 'neutral');
  }

  function handleVoiceCommand(spokenCommand) {
    const original = spokenCommand.trim().replace(/[.!?]+$/, '');
    const raw = original.replace(/^hey\s+lion\b[:,]?\s*/i, '').replace(/^lion\b[:,]?\s*/i, '').trim();
    const command = raw.toLowerCase();

    if (!command) return 'I’m here. You can ask me to manage any task, event, deadline, free-time window, or schedule view.';

    if (/^(hi|hello|hey)( lion| smart ?schedule)?$/.test(command)) {
      return `Hi ${user.name.split(/\s+/)[0]}. I’m Lion, your SmartSchedule assistant. I can manage tasks, events, deadlines, availability, and every schedule view. What would you like me to do?`;
    }

    if ((command.includes('what') && (command.includes('schedule') || command.includes('plan') || command.includes("what's on") || command.includes('what is on'))) || command.includes('read my day')) {
      const targetDate = command.includes('tomorrow') ? addDays(today, 1) : today;
      const entries = getEntriesForDate(items, targetDate).filter(i => i.status !== 'done');
      setSelectedDate(targetDate);
      setPage('plan');
      setView('day');
      if (!entries.length) return `You have nothing scheduled for ${command.includes('tomorrow') ? 'tomorrow' : 'today'}.`;
      const summary = entries.slice(0, 4).map(i => `${i.title} at ${formatTime(i.displayStart)}`).join(', ');
      const extra = entries.length > 4 ? `, plus ${entries.length - 4} more activities` : '';
      return `Your ${command.includes('tomorrow') ? 'tomorrow' : 'today'} includes ${summary}${extra}.`;
    }

    if (command.includes('show') && command.includes('week') || command.includes('weekly schedule')) {
      setPage('calendar');
      setView('week');
      return 'Here is your weekly schedule. I have highlighted fixed events and focused work.';
    }

    if (command.includes('show today') || command === 'today') {
      setSelectedDate(today);
      setPage('plan');
      setView('day');
      return 'Showing today’s schedule.';
    }

    if (command.includes('optimize') || command.includes('plan my day') || command.includes('regenerate')) {
      setPage('plan');
      generateSchedule(command.includes('week') ? 'week' : 'day');
      return `I’m optimizing your ${command.includes('week') ? 'week' : 'day'} now. I’ll remove conflicts and keep fifteen-minute breaks.`;
    }

    if (command.includes('show') && command.includes('task')) {
      setPage('tasks');
      return `Showing all tasks. You have ${tasks.filter(t => t.status !== 'done').length} active and ${tasks.filter(t => t.status === 'done').length} completed.`;
    }

    if (command.includes('list my tasks') || command.includes('read my tasks') || command.includes('active tasks')) {
      const activeTasks = tasks.filter(t => t.status !== 'done').sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      if (!activeTasks.length) return 'You have no active tasks.';
      return `Your next tasks are ${activeTasks.slice(0, 5).map(t => `${t.title}, ${t.priority.toLowerCase()} priority`).join('; ')}${activeTasks.length > 5 ? `; and ${activeTasks.length - 5} more` : ''}.`;
    }

    if (command.includes('deadline') || command.includes('what is due') || command.includes("what's due")) {
      const due = tasks.filter(t => t.status !== 'done').sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      if (!due.length) return 'You have no upcoming deadlines.';
      return `Your nearest deadlines are ${due.slice(0, 4).map(t => `${t.title}, due ${shortDate(new Date(t.deadline))} at ${formatTime(t.deadline)}`).join('; ')}.`;
    }

    if (command.includes('free time') || command.includes('how busy') || command.includes('open time')) {
      const targetDate = command.includes('tomorrow') ? addDays(today, 1) : today;
      const free = calculateFreeTime(items, targetDate);
      return `You have approximately ${free} of open time ${command.includes('tomorrow') ? 'tomorrow' : 'today'}, based on your availability and scheduled activities.`;
    }

    if (command.includes('enable reminder') || command.includes('turn on reminder')) {
      enableReminders();
      return 'Task reminders are now active. I will tell you what to do when each scheduled activity begins.';
    }

    if (command.includes('disable reminder') || command.includes('turn off reminder') || command.includes('pause reminder')) {
      disableReminders();
      return 'I paused schedule reminders.';
    }

    if (command.includes('test reminder')) {
      setTimeout(testReminder, 1800);
      return 'Starting a test reminder.';
    }

    if (command.includes('next reminder')) {
      const next = items
        .filter(item => item.kind !== 'availability' && item.status !== 'done')
        .map(item => ({ item, time: new Date(item.kind === 'event' ? item.start : item.scheduledStart || item.deadline).getTime() }))
        .filter(entry => Number.isFinite(entry.time) && entry.time >= Date.now())
        .sort((a, b) => a.time - b.time)[0];
      return next ? `Your next reminder is ${next.item.title} on ${dayLabel(new Date(next.time))} at ${formatTime(new Date(next.time))}.` : 'You have no upcoming reminders.';
    }

    if (command.startsWith('delete ') || command.startsWith('remove ') || command.startsWith('cancel ')) {
      const requested = command.replace(/^(delete|remove|cancel)\s+/, '').replace(/^(task|event|appointment|meeting)\s+/, '').trim();
      const match = items.find(i => i.kind !== 'availability' && i.title?.toLowerCase().includes(requested));
      if (!match) return `I couldn’t find an item matching ${requested}.`;
      deleteItem(match.id);
      return `I removed ${match.title} from your schedule.`;
    }

    if (command.startsWith('rename ')) {
      const parts = raw.match(/^rename\s+(.+?)\s+to\s+(.+)$/i);
      if (!parts) return 'Say rename, the current task or event name, then the new name.';
      const match = items.find(i => i.title?.toLowerCase().includes(parts[1].toLowerCase()));
      if (!match) return `I couldn’t find ${parts[1]}.`;
      setItems(current => current.map(i => i.id === match.id ? { ...i, title: parts[2].trim() } : i));
      showToast(`Renamed to ${parts[2].trim()}`);
      return `I renamed ${match.title} to ${parts[2].trim()}.`;
    }

    if (command.includes('priority') && (command.startsWith('make ') || command.startsWith('set ') || command.startsWith('change '))) {
      const priority = command.includes('high') || command.includes('urgent') ? 'High' : command.includes('low') ? 'Low' : 'Medium';
      const requested = command
        .replace(/^(make|set|change)\s+/, '')
        .replace(/\s+(to\s+)?(high|medium|low|urgent)(\s+priority)?$/, '')
        .replace(/\s+priority\s+(to\s+)?(high|medium|low)$/, '')
        .trim();
      const task = tasks.find(t => t.title.toLowerCase().includes(requested));
      if (!task) return `I couldn’t find a task matching ${requested}.`;
      setItems(current => current.map(i => i.id === task.id ? { ...i, priority } : i));
      showToast(`${task.title} is now ${priority.toLowerCase()} priority`);
      return `I changed ${task.title} to ${priority.toLowerCase()} priority.`;
    }

    if (command.startsWith('complete ') || command.startsWith('mark ') && command.includes('complete')) {
      const requested = command.replace(/^complete\s+/, '').replace(/^mark\s+/, '').replace(/\s+(as\s+)?complete(d)?$/, '').trim();
      const task = tasks.find(t => t.status !== 'done' && (t.title.toLowerCase().includes(requested) || requested.includes(t.title.toLowerCase())));
      if (!task) return `I couldn’t find an active task matching ${requested}. Try saying the full task name.`;
      toggleTask(task.id);
      showToast(`Completed: ${task.title}`);
      return `Done. I marked ${task.title} complete.`;
    }

    if (command.startsWith('reopen ') || command.startsWith('mark ') && command.includes('unfinished')) {
      const requested = command.replace(/^reopen\s+/, '').replace(/^mark\s+/, '').replace(/\s+(as\s+)?unfinished$/, '').trim();
      const task = tasks.find(t => t.status === 'done' && t.title.toLowerCase().includes(requested));
      if (!task) return `I couldn’t find a completed task matching ${requested}.`;
      setItems(current => current.map(i => i.id === task.id ? { ...i, status: 'backlog', completedAt: null } : i));
      setTimeout(() => suggestMove({ ...task, status: 'backlog' }), 0);
      return `I reopened ${task.title} and found a new time suggestion.`;
    }

    if (command.startsWith('move ') || command.startsWith('reschedule ')) {
      const targetDate = command.includes('tomorrow') ? addDays(today, 1) : command.includes('today') ? today : null;
      const explicitTime = parseVoiceClock(command, 'to|at');
      const requested = command
        .replace(/^(move|reschedule)\s+/, '')
        .replace(/\s+(to\s+)?(today|tomorrow)\b.*$/i, '')
        .replace(/\s+(to|at)\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?.*$/i, '')
        .trim();
      const task = tasks.find(t => t.status !== 'done' && (t.title.toLowerCase().includes(requested) || requested.includes(t.title.toLowerCase())));
      if (!task) return `I couldn’t find that task. Try saying reschedule, followed by the task name.`;
      if (targetDate && explicitTime) {
        const proposed = isoAt(targetDate, explicitTime);
        const slot = findSlotForDay(items, targetDate, task.duration, task.preferred, task.id, userWorkHours);
        const useTime = slot === explicitTime ? explicitTime : slot;
        if (!useTime) return `I couldn’t find enough free time for ${task.title} on that day.`;
        setItems(current => current.map(i => i.id === task.id ? { ...i, scheduledStart: isoAt(targetDate, useTime), status: 'scheduled', completedAt: null } : i));
        showToast(`Moved ${task.title} to ${formatTime(isoAt(targetDate, useTime))}`);
        return useTime === explicitTime ? `I moved ${task.title} to ${command.includes('tomorrow') ? 'tomorrow' : 'today'} at ${formatTime(proposed)}.` : `That time conflicted with another activity, so I safely moved ${task.title} to ${formatTime(isoAt(targetDate, useTime))}.`;
      }
      suggestMove(task);
      return `I found the next conflict-free opening for ${task.title}. Review the suggestion at the top of your schedule.`;
    }

    if (command.startsWith('add task') || command.startsWith('create task') || command.startsWith('remind me to')) {
      const tomorrow = command.includes('tomorrow');
      const nextWeek = command.includes('next week');
      const dueDate = nextWeek ? addDays(today, 7) : tomorrow ? addDays(today, 1) : today;
      const durationMatch = command.match(/(?:for\s+)?(\d+)\s*(minute|minutes|mins|min|hour|hours|hr|hrs)/);
      let duration = durationMatch ? Number(durationMatch[1]) : 60;
      if (durationMatch && /hour|hr/.test(durationMatch[2])) duration *= 60;
      duration = Math.min(480, Math.max(15, Math.round(duration / 15) * 15));
      const priority = command.includes('high priority') || command.includes('urgent') ? 'High' : command.includes('low priority') ? 'Low' : 'Medium';
      const preferred = command.includes('morning') ? 'Morning' : command.includes('afternoon') ? 'Afternoon' : command.includes('evening') || command.includes('tonight') ? 'Evening' : 'Anytime';
      const timeMatch = command.match(/(?:by|at)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/);
      let dueTime = '18:00';
      if (timeMatch) {
        let hour = Number(timeMatch[1]);
        const minute = Number(timeMatch[2] || 0);
        const meridiem = timeMatch[3]?.replaceAll('.', '');
        if (meridiem === 'pm' && hour < 12) hour += 12;
        if (meridiem === 'am' && hour === 12) hour = 0;
        dueTime = `${pad(Math.min(hour, 23))}:${pad(minute)}`;
      }
      let title = raw.replace(/^(add|create)\s+(a\s+)?task\s+(to\s+)?/i, '').replace(/^remind me to\s+/i, '');
      title = title
        .replace(/\s+(today|tomorrow|tonight|next week)\b/ig, '')
        .replace(/\s+(in the\s+)?(morning|afternoon|evening)\b/ig, '')
        .replace(/\s+(with\s+)?(high|medium|low) priority\b/ig, '')
        .replace(/\s+urgent\b/ig, '')
        .replace(/\s+(?:for\s+)?\d+\s*(minute|minutes|mins|min|hour|hours|hr|hrs)\b/ig, '')
        .replace(/\s+(?:by|at)\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/ig, '')
        .trim();
      if (!title) {
        setModal({ type: 'create', kind: 'task' });
        return 'I opened the task form. Add a name and I’ll schedule it for you.';
      }
      const newTask = { kind: 'task', title: title.charAt(0).toUpperCase() + title.slice(1), category: 'Work', priority, duration, preferred, deadline: `${ymd(dueDate)}T${dueTime}:00`, scheduledStart: null, status: 'backlog', completedAt: null };
      saveItem(newTask);
      return `I added ${newTask.title}, set it to ${priority.toLowerCase()} priority, and found the best available time before ${tomorrow ? 'tomorrow' : nextWeek ? 'next week' : 'today'} at ${formatTime(newTask.deadline)}.`;
    }

    if (command.includes('set availability') || command.includes('add availability') || command.includes('i am free') || command.includes("i'm free")) {
      const date = command.includes('tomorrow') ? addDays(today, 1) : today;
      const startTime = parseVoiceClock(command, 'from|at');
      const endTime = parseVoiceClock(command, 'to|until|through');
      if (!startTime || !endTime || endTime <= startTime) {
        setModal({ type: 'create', kind: 'availability' });
        return 'I opened free-time settings. Tell me both a start and end time, for example: Lion, I am free tomorrow from nine A M to five P M.';
      }
      const availability = { id: `a${Date.now()}`, kind: 'availability', title: 'Voice-set availability', date: ymd(date), start: startTime, end: endTime };
      setItems(current => [...current.filter(i => !(i.kind === 'availability' && i.date === availability.date)), availability]);
      showToast(`Availability set for ${shortDate(date)}`);
      return `I set your availability for ${command.includes('tomorrow') ? 'tomorrow' : 'today'} from ${formatTime(isoAt(date, startTime))} to ${formatTime(isoAt(date, endTime))}.`;
    }

    if (command.includes('add appointment') || command.includes('add event') || command.includes('add meeting') || command.startsWith('schedule meeting') || command.startsWith('schedule appointment')) {
      const date = command.includes('tomorrow') ? addDays(today, 1) : command.includes('next week') ? addDays(today, 7) : today;
      const startTime = parseVoiceClock(command, 'at|from');
      const duration = parseVoiceDuration(command, 60);
      if (!startTime) {
        setModal({ type: 'create', kind: 'event' });
        return 'I opened a new event. Add the fixed start and end times, and I’ll protect that space.';
      }
      const endMinutes = Math.min(23 * 60 + 59, timeToMinutes(startTime) + duration);
      let title = raw
        .replace(/^(add|create|schedule)\s+(an?\s+)?(event|appointment|meeting)\s*/i, '')
        .replace(/\s+(today|tomorrow|next week)\b/ig, '')
        .replace(/\s+(?:at|from)\s+\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/ig, '')
        .replace(/\s+(?:for\s+)?\d+(?:\.\d+)?\s*(minute|minutes|mins|min|hour|hours|hr|hrs)\b/ig, '')
        .trim();
      title = title || 'New appointment';
      const newEvent = { id: `e${Date.now()}`, kind: 'event', title: title.charAt(0).toUpperCase() + title.slice(1), category: 'Work', start: isoAt(date, startTime), end: isoAt(date, minutesToTime(endMinutes)), fixed: true };
      const clash = getEntriesForDate(items, date).find(entry => new Date(newEvent.start) < new Date(entry.displayEnd) && new Date(newEvent.end) > new Date(entry.displayStart));
      if (clash) return `${newEvent.title} would overlap with ${clash.title}. I did not add it. Ask me to move ${clash.title}, or choose another time.`;
      setItems(current => [...current, newEvent]);
      showToast(`Event added at ${formatTime(newEvent.start)}`);
      return `I added ${newEvent.title} ${command.includes('tomorrow') ? 'tomorrow' : command.includes('next week') ? 'next week' : 'today'} at ${formatTime(newEvent.start)} for ${formatMinutes(duration)}.`;
    }

    if (command.includes('open settings') || command.includes('personal settings') || command.includes('voice command list')) {
      setPage('settings');
      return 'Opening your personal settings. Select LION voice commands to browse and copy the complete command library.';
    }

    if (command.includes('help') || command.includes('what can you do') || command.includes('everything you can do')) {
      return 'I can add, rename, prioritize, complete, reopen, move, and delete tasks; create or cancel events; set availability; read deadlines and free time; optimize your day or week; and open every schedule view. Start your voice command with Lion.';
    }

    return 'I didn’t quite understand that. Start with Lion, then ask me to add or edit a task, create an event, set free time, read deadlines, optimize the schedule, or open a view.';
  }

  const activeDateEntries = getEntriesForDate(items, selectedDate);
  const timelineRange = getTimelineRange(activeDateEntries);

  return (
    <div className="app-shell" onClick={() => openMenu && setOpenMenu(null)}>
      <Sidebar page={page} navigate={navigatePage} resetDemo={resetDemo} mobileOpen={mobileNav} close={() => setMobileNav(false)} user={user} onLogout={onLogout} />
      <div className="mobile-overlay" data-open={mobileNav} onClick={() => setMobileNav(false)} />

      <main className="main-area">
        <Topbar setMobileNav={setMobileNav} onAdd={() => setModal({ type: 'create', kind: 'task' })} remindersEnabled={remindersEnabled} onReminderClick={() => setReminderPanel(value => !value)} syncStatus={syncStatus} />
        <div className="page-wrap">
          {page === 'tasks' ? (
            <TasksPage tasks={tasks} filter={taskFilter} setFilter={setTaskFilter} onAdd={() => setModal({ type: 'create', kind: 'task' })} onEdit={item => setModal({ type: 'edit', item })} onDelete={deleteItem} onToggle={toggleTask} />
          ) : page === 'settings' ? (
            <SettingsPage user={user} onSave={onUpdateUser} onLogout={onLogout} showToast={showToast} remindersEnabled={remindersEnabled} onOpenReminders={() => setReminderPanel(true)} />
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow"><Sparkles size={14} /> Your plan, intelligently arranged</div>
                  <h1>{page === 'calendar' ? 'Weekly planner' : 'Today’s schedule'}</h1>
                  <p>{dayLabel(selectedDate)} <span className="dot-sep">•</span> <span className="weather"><MapPin size={14} /> {user.location || user.timezone || 'Local schedule'}</span></p>
                </div>
                <div className="heading-actions">
                  <button className="button secondary" onClick={() => setModal({ type: 'create', kind: 'event' })}><CalendarClock size={17} /> Add event</button>
                  <button className="button primary" onClick={() => setModal({ type: 'create', kind: 'task' })}><Plus size={18} /> Add task</button>
                </div>
              </section>

              {suggestion && <SuggestionBanner suggestion={suggestion} onAccept={acceptSuggestion} onDismiss={() => setSuggestion(null)} />}

              <section className="summary-grid">
                <SummaryCard icon={BrainCircuit} tone="violet" label="Focus time" value={focusMins ? formatMinutes(focusMins) : '0m'} note="Protected today" />
                <SummaryCard icon={CircleCheck} tone="green" label="Completed" value={`${completedToday}/${Math.max(scheduledToday.length, 1)}`} note={completedToday ? 'Nice momentum' : 'Ready when you are'} />
                <SummaryCard icon={TimerReset} tone="orange" label="Open time" value={calculateFreeTime(items, selectedDate)} note="Across 3 windows" />
                <SummaryCard icon={Sparkles} tone="blue" label="Smart score" value="92%" note="Well balanced" />
              </section>

              <section className="planner-card">
                <div className="planner-toolbar">
                  <div className="date-controls">
                    <button className="icon-button" aria-label="Previous" onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? -7 : -1))}><ChevronLeft size={19} /></button>
                    <button className="today-button" onClick={() => setSelectedDate(today)}>Today</button>
                    <button className="icon-button" aria-label="Next" onClick={() => setSelectedDate(addDays(selectedDate, view === 'week' ? 7 : 1))}><ChevronRight size={19} /></button>
                    <strong>{view === 'week' ? `${shortDate(weekDays[0])} – ${shortDate(weekDays[6])}` : shortDate(selectedDate)}</strong>
                  </div>
                  <div className="toolbar-right">
                    <div className="segmented">
                      <button data-active={view === 'day'} onClick={() => setView('day')}>Day</button>
                      <button data-active={view === 'week'} onClick={() => setView('week')}>Week</button>
                    </div>
                    <button className="button ai-button" onClick={() => generateSchedule(view)} disabled={generating}>
                      {generating ? <span className="loader" /> : <WandSparkles size={17} />}{generating ? 'Optimizing…' : 'Optimize plan'}
                    </button>
                  </div>
                </div>

                {view === 'day' ? (
                  <div className="planner-content">
                    <div className="timeline-panel">
                      <div className="panel-title-row">
                        <div><h2>Your day</h2><p>{activeDateEntries.length} activities · breaks included automatically</p></div>
                        <span className="status-pill"><span /> No conflicts</span>
                      </div>
                      <DayTimeline entries={activeDateEntries} range={timelineRange} onToggle={toggleTask} onMenu={(id, event) => { event.stopPropagation(); setOpenMenu(openMenu === id ? null : id); }} openMenu={openMenu} onEdit={item => { setModal({ type: 'edit', item }); setOpenMenu(null); }} onDelete={deleteItem} onMove={suggestMove} onAdd={() => setModal({ type: 'create', kind: 'task' })} />
                    </div>
                    <AsidePanel tasks={tasks} selectedDate={selectedDate} highDue={highDue} onEdit={item => setModal({ type: 'edit', item })} onMove={suggestMove} onAddAvailability={() => setModal({ type: 'create', kind: 'availability' })} />
                  </div>
                ) : (
                  <WeekView days={weekDays} items={items} selectedDate={selectedDate} setSelectedDate={d => { setSelectedDate(d); setView('day'); }} onEdit={item => setModal({ type: 'edit', item })} />
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <MobileBottomNav page={page} navigate={navigatePage} onAdd={() => setModal({ type: 'create', kind: 'task' })} />
      <VoiceAssistant onCommand={handleVoiceCommand} user={user} />
      {reminderPanel && <ReminderCenter items={items} enabled={remindersEnabled} onEnable={enableReminders} onDisable={disableReminders} onTest={testReminder} onClose={() => setReminderPanel(false)} />}
      {dueAlert && <DueReminder alert={dueAlert} onDismiss={() => setDueAlert(null)} onSnooze={() => snoozeReminder(dueAlert.item)} onComplete={() => { if (!dueAlert.test && dueAlert.item.kind === 'task') toggleTask(dueAlert.item.id); setDueAlert(null); }} />}
      {modal && <ItemModal config={modal} selectedDate={selectedDate} onClose={() => setModal(null)} onSave={saveItem} onDelete={deleteItem} />}
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Sidebar({ page, navigate, resetDemo, mobileOpen, close, user, onLogout }) {
  const initials = user.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark"><Sparkles size={20} /></div>
        <span>SmartSchedule</span>
        <button className="sidebar-close" onClick={close}><PanelLeftClose size={20} /></button>
      </div>
      <nav className="sidebar-nav">
        <span className="nav-label">Workspace</span>
        <button data-active={page === 'plan'} onClick={() => navigate('plan')}><LayoutDashboard size={19} /> Today <span className="nav-badge">4</span></button>
        <button data-active={page === 'tasks'} onClick={() => navigate('tasks')}><CheckSquare2 size={19} /> Tasks</button>
        <button data-active={page === 'calendar'} onClick={() => navigate('calendar')}><CalendarDays size={19} /> Calendar</button>
        <span className="nav-label space-top">Favorites</span>
        <button><span className="color-dot violet" /> Work</button>
        <button><span className="color-dot teal" /> Study</button>
        <button><span className="color-dot amber" /> Personal</button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="focus-card">
        <div className="focus-icon"><BrainCircuit size={19} /></div>
        <strong>Make room for focus</strong>
        <p>SmartSchedule protects deep-work time as your week changes.</p>
        <button onClick={() => navigate('calendar')}>View weekly plan <ArrowRight size={15} /></button>
      </div>
      <div className="sidebar-bottom">
        <button onClick={resetDemo}><RotateCcw size={18} /> Reset demo</button>
        <button data-active={page === 'settings'} onClick={() => navigate('settings')}><Settings size={18} /> Personal settings</button>
        <div className="profile-row">
          <div className="avatar">{initials}</div><div><strong>{user.name}</strong><span>{user.email}</span></div><button className="profile-logout" onClick={onLogout} title="Sign out"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ setMobileNav, onAdd, remindersEnabled, onReminderClick, syncStatus }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={22} /></button>
      <div className="mobile-brand"><div className="brand-mark small"><Sparkles size={16} /></div>SmartSchedule</div>
      <div className="search-box"><Search size={17} /><input placeholder="Search tasks and events" /><kbd>⌘ K</kbd></div>
      <div className="top-actions"><span className={`cloud-sync ${syncStatus}`}><i /> {syncStatus === 'saved' ? 'Saved to Supabase' : syncStatus === 'syncing' ? 'Saving…' : syncStatus === 'error' ? 'Sync issue' : 'Connecting…'}</span><button className="quick-add" onClick={onAdd}><Plus size={18} /> Quick add</button><button className={`notification-button ${remindersEnabled ? 'enabled' : ''}`} onClick={onReminderClick} aria-label="LION reminder settings"><Bell size={19} /><span /></button></div>
    </header>
  );
}

function SummaryCard({ icon: Icon, tone, label, value, note }) {
  return (
    <article className="summary-card">
      <div className={`summary-icon ${tone}`}><Icon size={19} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>
  );
}

function SuggestionBanner({ suggestion, onAccept, onDismiss }) {
  return (
    <div className="suggestion-banner">
      <div className="suggestion-spark"><WandSparkles size={19} /></div>
      <div><strong>I found a new spot for “{suggestion.task.title}”</strong><p>{dayLabel(suggestion.date)} at {formatTime(isoAt(suggestion.date, suggestion.slot))} · includes a 15-minute buffer</p></div>
      <div className="suggestion-actions"><button className="button primary small" onClick={onAccept}>Move task</button><button className="icon-button" onClick={onDismiss}><X size={18} /></button></div>
    </div>
  );
}

function getEntriesForDate(items, date) {
  const key = ymd(date);
  return items.filter(item => {
    if (item.status === 'done' && item.kind === 'task') return item.scheduledStart?.slice(0, 10) === key;
    const value = item.kind === 'event' ? item.start : item.kind === 'task' ? item.scheduledStart : null;
    return value?.slice(0, 10) === key;
  }).map(item => {
    const startValue = item.kind === 'event' ? item.start : item.scheduledStart;
    const endValue = item.kind === 'event'
      ? item.end
      : new Date(new Date(startValue).getTime() + item.duration * 60000).toISOString().slice(0, 16);
    return { ...item, displayStart: startValue, displayEnd: endValue };
  }).sort((a, b) => new Date(a.displayStart) - new Date(b.displayStart));
}

function getTimelineRange(entries) {
  if (!entries.length) return { start: 8 * 60, end: 18 * 60 };
  const first = timeToMinutes(entries[0].displayStart.slice(11, 16));
  const last = Math.max(...entries.map(e => timeToMinutes(e.displayEnd.slice(11, 16))));
  return { start: Math.floor(Math.min(first, 8 * 60) / 60) * 60, end: Math.ceil(Math.max(last, 18 * 60) / 60) * 60 };
}

function DayTimeline({ entries, onToggle, onMenu, openMenu, onEdit, onDelete, onMove, onAdd }) {
  if (!entries.length) {
    return <div className="empty-state"><div><CalendarDays size={28} /></div><h3>A clear day</h3><p>Add a task or let SmartSchedule plan work from your backlog.</p><button className="button primary" onClick={onAdd}><Plus size={17} /> Add a task</button></div>;
  }
  const rows = [];
  entries.forEach((entry, index) => {
    if (index > 0) {
      const prev = entries[index - 1];
      const gap = (new Date(entry.displayStart) - new Date(prev.displayEnd)) / 60000;
      if (gap >= 15 && gap <= 45) rows.push({ break: true, minutes: gap, after: prev.id, time: prev.displayEnd });
    }
    rows.push(entry);
  });
  return (
    <div className="timeline-list">
      {rows.map(row => row.break ? (
        <div className="break-row" key={`break-${row.after}`}>
          <div className="timeline-time">{formatTime(row.time)}</div>
          <div className="break-line"><span><Coffee size={14} /> {row.minutes}-min reset</span></div>
        </div>
      ) : (
        <ScheduleItem key={row.id} item={row} onToggle={onToggle} onMenu={onMenu} menuOpen={openMenu === row.id} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
      ))}
    </div>
  );
}

function ScheduleItem({ item, onToggle, onMenu, menuOpen, onEdit, onDelete, onMove }) {
  const meta = categoryMeta[item.category] || categoryMeta.Personal;
  const Icon = meta.icon;
  return (
    <div className={`schedule-row ${item.status === 'done' ? 'is-done' : ''}`}>
      <div className="timeline-time"><strong>{formatTime(item.displayStart)}</strong><span>{formatTime(item.displayEnd)}</span></div>
      <div className="timeline-track"><span className="track-dot" style={{ background: meta.color }} /></div>
      <article className="schedule-item" style={{ '--accent': meta.color, '--soft': meta.soft }}>
        <button className={`task-check ${item.kind === 'event' ? 'fixed' : ''}`} onClick={() => item.kind === 'task' && onToggle(item.id)} aria-label="Mark complete">
          {item.status === 'done' ? <Check size={15} /> : item.kind === 'event' ? <CalendarDays size={14} /> : null}
        </button>
        <div className="schedule-copy">
          <div className="schedule-title-line"><h3>{item.title}</h3>{item.priority === 'High' && <span className="priority-chip"><Flag size={11} /> High</span>}</div>
          <p><span><Icon size={13} /> {item.category}</span><span><Clock3 size={13} /> {item.kind === 'task' ? formatMinutes(item.duration) : formatMinutes((new Date(item.end) - new Date(item.start)) / 60000)}</span>{item.kind === 'event' && <span className="fixed-label">Fixed</span>}</p>
        </div>
        <button className="more-button" onClick={event => onMenu(item.id, event)}><MoreHorizontal size={18} /></button>
        {menuOpen && (
          <div className="item-menu" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(item)}><Pencil size={15} /> Edit details</button>
            {item.kind === 'task' && <button onClick={() => onMove(item)}><CalendarClock size={15} /> Find a new time</button>}
            <button className="danger" onClick={() => onDelete(item.id)}><Trash2 size={15} /> Delete</button>
          </div>
        )}
      </article>
    </div>
  );
}

function AsidePanel({ tasks, selectedDate, highDue, onEdit, onMove, onAddAvailability }) {
  const upcoming = tasks.filter(t => t.status !== 'done').sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4);
  return (
    <aside className="right-panel">
      <div className="ai-insight">
        <div className="insight-head"><span><Sparkles size={16} /> AI insight</span><small>Updated now</small></div>
        <strong>Your afternoon has healthy breathing room.</strong>
        <p>I kept 15 minutes between focused work and your client workshop.</p>
      </div>
      <div className="aside-section">
        <div className="aside-title"><div><h3>Upcoming deadlines</h3><span>{highDue} high priority</span></div><button><MoreHorizontal size={18} /></button></div>
        <div className="deadline-list">
          {upcoming.map(task => {
            const overdue = new Date(task.deadline) < new Date();
            return <button className="deadline-item" key={task.id} onClick={() => onEdit(task)}>
              <span className={`priority-bar ${task.priority.toLowerCase()}`} />
              <div><strong>{task.title}</strong><small className={overdue ? 'overdue' : ''}>{overdue ? 'Due today' : `Due ${shortDate(new Date(task.deadline))}`} · {formatMinutes(task.duration)}</small></div>
              <ChevronRight size={16} />
            </button>;
          })}
        </div>
      </div>
      <button className="availability-card" onClick={onAddAvailability}>
        <div><CalendarClock size={18} /></div><span><strong>Set free time</strong><small>Tell AI when you’re available</small></span><Plus size={17} />
      </button>
    </aside>
  );
}

function WeekView({ days, items, selectedDate, setSelectedDate, onEdit }) {
  return (
    <div className="week-wrap">
      <div className="week-grid">
        {days.map(day => {
          const entries = getEntriesForDate(items, day);
          const isToday = ymd(day) === ymd(today);
          return <div className="week-day" key={ymd(day)}>
            <button className="week-day-head" data-today={isToday} onClick={() => setSelectedDate(day)}>
              <span>{day.toLocaleDateString([], { weekday: 'short' })}</span><strong>{day.getDate()}</strong>{isToday && <small>Today</small>}
            </button>
            <div className="week-items">
              {entries.map(entry => {
                const meta = categoryMeta[entry.category] || categoryMeta.Personal;
                return <button className="week-item" key={entry.id} style={{ '--accent': meta.color, '--soft': meta.soft }} onClick={() => onEdit(entry)}>
                  <span>{formatTime(entry.displayStart)}</span><strong>{entry.title}</strong><small>{entry.kind === 'task' ? formatMinutes(entry.duration) : 'Event'}</small>
                </button>;
              })}
              {!entries.length && <button className="week-empty" onClick={() => setSelectedDate(day)}><Plus size={15} /> Open</button>}
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}

function TasksPage({ tasks, filter, setFilter, onAdd, onEdit, onDelete, onToggle }) {
  const visible = tasks.filter(t => filter === 'All' || filter === 'Completed' ? (filter === 'All' || t.status === 'done') : t.priority === filter);
  const active = tasks.filter(t => t.status !== 'done').length;
  return (
    <>
      <section className="page-heading tasks-heading">
        <div><div className="eyebrow"><CheckSquare2 size={14} /> Everything in one place</div><h1>My tasks</h1><p>{active} active tasks · {tasks.filter(t => t.status === 'done').length} completed</p></div>
        <button className="button primary" onClick={onAdd}><Plus size={18} /> Add task</button>
      </section>
      <section className="tasks-board">
        <div className="task-board-toolbar">
          <div className="filter-tabs">{['All', 'High', 'Medium', 'Low', 'Completed'].map(label => <button key={label} data-active={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
          <button className="button secondary compact"><ListFilter size={16} /> Filter</button>
        </div>
        <div className="task-table-head"><span>Task</span><span>Deadline</span><span>Priority</span><span>Duration</span><span>Scheduled</span><span /></div>
        <div className="task-table">
          {visible.map(task => {
            const meta = categoryMeta[task.category] || categoryMeta.Personal;
            const Icon = meta.icon;
            return <div className={`task-table-row ${task.status === 'done' ? 'is-done' : ''}`} key={task.id}>
              <div className="task-name-cell"><button className="task-check" onClick={() => onToggle(task.id)}>{task.status === 'done' && <Check size={15} />}</button><span className="category-square" style={{ background: meta.soft, color: meta.color }}><Icon size={16} /></span><div><strong>{task.title}</strong><small>{task.category}</small></div></div>
              <span>{shortDate(new Date(task.deadline))}</span>
              <span><span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span></span>
              <span>{formatMinutes(task.duration)}</span>
              <span>{task.scheduledStart ? `${shortDate(new Date(task.scheduledStart))}, ${formatTime(task.scheduledStart)}` : <em>Unscheduled</em>}</span>
              <div className="table-actions"><button onClick={() => onEdit(task)}><Pencil size={16} /></button><button onClick={() => onDelete(task.id)}><Trash2 size={16} /></button></div>
            </div>;
          })}
          {!visible.length && <div className="empty-table"><CircleCheck size={30} /><strong>No tasks here</strong><span>Try a different filter or add a new task.</span></div>}
        </div>
      </section>
    </>
  );
}

function ItemModal({ config, selectedDate, onClose, onSave, onDelete }) {
  const existing = config.item;
  const [kind, setKind] = useState(existing?.kind || config.kind || 'task');
  const defaultDate = ymd(selectedDate);
  const [form, setForm] = useState(() => {
    if (existing) {
      if (existing.kind === 'task') return { ...existing, deadlineDate: existing.deadline.slice(0, 10), deadlineTime: existing.deadline.slice(11, 16), scheduledDate: existing.scheduledStart?.slice(0, 10) || '', scheduledTime: existing.scheduledStart?.slice(11, 16) || '' };
      if (existing.kind === 'event') return { ...existing, date: existing.start.slice(0, 10), startTime: existing.start.slice(11, 16), endTime: existing.end.slice(11, 16) };
      return { ...existing };
    }
    return { title: '', category: 'Work', priority: 'Medium', duration: 60, preferred: 'Anytime', deadlineDate: defaultDate, deadlineTime: '18:00', date: defaultDate, startTime: '09:00', endTime: '10:00', start: '08:00', end: '18:00' };
  });
  const [error, setError] = useState('');
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return setError('Please add a name.');
    if (kind === 'event' && form.endTime <= form.startTime) return setError('End time must be after start time.');
    if (kind === 'availability' && form.end <= form.start) return setError('Availability must end after it starts.');
    let data;
    if (kind === 'task') {
      data = { id: existing?.id, kind, title: form.title.trim(), category: form.category, priority: form.priority, duration: Number(form.duration), preferred: form.preferred, deadline: `${form.deadlineDate}T${form.deadlineTime}:00`, scheduledStart: form.scheduledDate && form.scheduledTime ? `${form.scheduledDate}T${form.scheduledTime}:00` : existing?.scheduledStart || null, status: existing?.status || 'backlog', completedAt: existing?.completedAt || null };
    } else if (kind === 'event') {
      data = { id: existing?.id, kind, title: form.title.trim(), category: form.category, start: `${form.date}T${form.startTime}:00`, end: `${form.date}T${form.endTime}:00`, fixed: true };
    } else {
      data = { id: existing?.id, kind, title: form.title.trim(), date: form.date, start: form.start, end: form.end };
    }
    onSave(data);
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head"><div><span className="modal-kicker">{existing ? 'Update your plan' : 'Create something new'}</span><h2>{existing ? `Edit ${kind}` : 'Add to SmartSchedule'}</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div>
        {!existing && <div className="kind-tabs">
          <button data-active={kind === 'task'} onClick={() => setKind('task')}><CheckSquare2 size={16} /> Task</button>
          <button data-active={kind === 'event'} onClick={() => setKind('event')}><CalendarDays size={16} /> Event</button>
          <button data-active={kind === 'availability'} onClick={() => setKind('availability')}><Clock3 size={16} /> Free time</button>
        </div>}
        <form onSubmit={submit}>
          <label className="field full"><span>{kind === 'availability' ? 'Label' : 'Name'}</span><input autoFocus value={form.title} onChange={e => update('title', e.target.value)} placeholder={kind === 'task' ? 'e.g. Finish project proposal' : kind === 'event' ? 'e.g. Team meeting' : 'e.g. Weekday availability'} /></label>
          {kind !== 'availability' && <label className="field full"><span>Category</span><select value={form.category} onChange={e => update('category', e.target.value)}>{Object.keys(categoryMeta).map(c => <option key={c}>{c}</option>)}</select></label>}
          {kind === 'task' && <>
            <div className="form-grid">
              <label className="field"><span>Deadline</span><input type="date" value={form.deadlineDate} onChange={e => update('deadlineDate', e.target.value)} /></label>
              <label className="field"><span>Due by</span><input type="time" value={form.deadlineTime} onChange={e => update('deadlineTime', e.target.value)} /></label>
              <label className="field"><span>Priority</span><select value={form.priority} onChange={e => update('priority', e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></label>
              <label className="field"><span>Estimated duration</span><select value={form.duration} onChange={e => update('duration', e.target.value)}>{[15, 30, 45, 60, 75, 90, 120, 180].map(m => <option value={m} key={m}>{formatMinutes(m)}</option>)}</select></label>
              <label className="field full"><span>Preferred time</span><div className="choice-row">{['Morning', 'Afternoon', 'Evening', 'Anytime'].map(value => <button type="button" key={value} data-active={form.preferred === value} onClick={() => update('preferred', value)}>{value}</button>)}</div></label>
              {existing && <><label className="field"><span>Scheduled date</span><input type="date" value={form.scheduledDate} onChange={e => update('scheduledDate', e.target.value)} /></label><label className="field"><span>Scheduled start</span><input type="time" value={form.scheduledTime} onChange={e => update('scheduledTime', e.target.value)} /></label></>}
            </div>
            {!existing && <div className="ai-note"><Sparkles size={16} /><span><strong>Smart placement is on.</strong> We’ll find a conflict-free time before the deadline and leave a 15-minute buffer.</span></div>}
          </>}
          {kind === 'event' && <div className="form-grid"><label className="field full"><span>Date</span><input type="date" value={form.date} onChange={e => update('date', e.target.value)} /></label><label className="field"><span>Starts</span><input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} /></label><label className="field"><span>Ends</span><input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} /></label></div>}
          {kind === 'availability' && <div className="form-grid"><label className="field full"><span>Date</span><input type="date" value={form.date} onChange={e => update('date', e.target.value)} /></label><label className="field"><span>Available from</span><input type="time" value={form.start} onChange={e => update('start', e.target.value)} /></label><label className="field"><span>Available until</span><input type="time" value={form.end} onChange={e => update('end', e.target.value)} /></label></div>}
          {error && <p className="form-error"><CircleAlert size={15} /> {error}</p>}
          <div className="modal-actions">{existing && <button type="button" className="delete-button" onClick={() => onDelete(existing.id)}><Trash2 size={16} /> Delete</button>}<span /><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary">{existing ? 'Save changes' : kind === 'task' ? 'Add & schedule' : 'Add to calendar'}</button></div>
        </form>
      </div>
    </div>
  );
}

function calculateFreeTime(items, date) {
  const avail = items.find(i => i.kind === 'availability' && i.date === ymd(date));
  const total = avail ? timeToMinutes(avail.end) - timeToMinutes(avail.start) : 10 * 60;
  const used = getEntriesForDate(items, date).reduce((sum, item) => sum + (new Date(item.displayEnd) - new Date(item.displayStart)) / 60000, 0);
  return formatMinutes(Math.max(total - used, 0));
}

const LION_COMMAND_GROUPS = [
  {
    title: 'Plan and navigate', icon: CalendarDays, color: 'violet', commands: [
      ['Read today’s schedule', 'Lion, what’s on my schedule today?'],
      ['Read tomorrow’s schedule', 'Lion, what’s on my schedule tomorrow?'],
      ['Open today', 'Lion, show today.'],
      ['Open weekly calendar', 'Lion, show my week.'],
      ['Open task manager', 'Lion, show my tasks.'],
      ['Read active tasks', 'Lion, list my active tasks.'],
      ['Optimize your day', 'Lion, optimize my day.'],
      ['Optimize your week', 'Lion, optimize my week.']
    ]
  },
  {
    title: 'Create tasks', icon: Plus, color: 'blue', commands: [
      ['Add a basic task', 'Lion, add task finish the report.'],
      ['Add with deadline', 'Lion, add task finish the report tomorrow by 5 PM.'],
      ['Add with duration', 'Lion, add task study chapter four tomorrow for one hour.'],
      ['Add urgent work', 'Lion, add task submit the proposal today for 90 minutes, high priority.'],
      ['Set preferred time', 'Lion, add task review my notes tomorrow morning for 45 minutes.']
    ]
  },
  {
    title: 'Manage tasks', icon: CheckSquare2, color: 'green', commands: [
      ['Complete a task', 'Lion, mark finish product proposal complete.'],
      ['Reopen unfinished work', 'Lion, mark finish product proposal unfinished.'],
      ['Rename a task', 'Lion, rename research notes to competitor analysis.'],
      ['Change priority', 'Lion, make competitor analysis high priority.'],
      ['Find a new time', 'Lion, reschedule competitor analysis.'],
      ['Move to a time', 'Lion, move competitor analysis to tomorrow at 3 PM.'],
      ['Delete a task', 'Lion, delete competitor analysis.']
    ]
  },
  {
    title: 'Events and appointments', icon: CalendarClock, color: 'orange', commands: [
      ['Create a meeting', 'Lion, add meeting team review tomorrow at 2 PM for one hour.'],
      ['Create an appointment', 'Lion, schedule appointment dentist tomorrow at 10 AM for 30 minutes.'],
      ['Cancel an event', 'Lion, cancel team review.'],
      ['Open event form', 'Lion, add an event.']
    ]
  },
  {
    title: 'Availability and insights', icon: TimerReset, color: 'teal', commands: [
      ['Set free time', 'Lion, I am free tomorrow from 9 AM to 5 PM.'],
      ['Replace availability', 'Lion, set availability today from 8 AM to 6 PM.'],
      ['Check open time', 'Lion, how much free time do I have today?'],
      ['Read deadlines', 'Lion, what are my upcoming deadlines?'],
      ['Check workload', 'Lion, how busy am I tomorrow?']
    ]
  },
  {
    title: 'Reminders', icon: Bell, color: 'rose', commands: [
      ['Enable reminders', 'Lion, enable reminders.'],
      ['Pause reminders', 'Lion, disable reminders.'],
      ['Test the voice reminder', 'Lion, test reminder.'],
      ['Read next reminder', 'Lion, what is my next reminder?']
    ]
  },
  {
    title: 'LION help', icon: AudioLines, color: 'dark', commands: [
      ['Ask for capabilities', 'Lion, what can you do?'],
      ['Open personal settings', 'Lion, open personal settings.'],
      ['Open command library', 'Lion, open the voice command list.'],
      ['Wake LION', 'Lion.'],
      ['Get command help', 'Lion, help me.']
    ]
  }
];

function SettingsPage({ user, onSave, onLogout, showToast, remindersEnabled, onOpenReminders }) {
  const [tab, setTab] = useState('profile');
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState({
    name: user.name || '', email: user.email || '', phone: user.phone || '', role: user.role || 'Personal',
    location: user.location || '', timezone: user.timezone || 'Africa/Accra', workStart: user.workStart || '08:00', workEnd: user.workEnd || '18:00'
  });
  const [saved, setSaved] = useState(false);
  const initials = profile.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const update = (key, value) => { setProfile(current => ({ ...current, [key]: value })); setSaved(false); };
  const filteredGroups = LION_COMMAND_GROUPS.map(group => ({ ...group, commands: group.commands.filter(([label, command]) => `${label} ${command}`.toLowerCase().includes(query.toLowerCase())) })).filter(group => group.commands.length);

  async function saveProfile(event) {
    event.preventDefault();
    if (profile.name.trim().length < 2) return showToast('Please enter your full name', 'neutral');
    if (profile.workEnd <= profile.workStart) return showToast('Your day must end after it starts', 'neutral');
    try {
      await onSave({ ...profile, name: profile.name.trim(), phone: profile.phone.trim(), location: profile.location.trim() });
      setSaved(true);
      showToast('Personal information saved to Supabase');
    } catch (error) {
      showToast(error.message || 'Profile could not be saved', 'neutral');
    }
  }

  async function copyCommand(command) {
    try { await navigator.clipboard.writeText(command); showToast('Voice command copied'); }
    catch { showToast('Select the command and copy it manually', 'neutral'); }
  }

  return <>
    <section className="page-heading settings-heading">
      <div><div className="eyebrow"><Settings size={14} /> Your account and assistant</div><h1>Personal settings</h1><p>Manage your information, preferences, and every LION voice command.</p></div>
      <span className="secure-account-pill"><ShieldCheck size={15} /> Authenticated account</span>
    </section>
    <section className="settings-shell">
      <aside className="settings-nav">
        <div className="settings-profile-mini"><div className="settings-avatar">{initials}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></div>
        <button data-active={tab === 'profile'} onClick={() => setTab('profile')}><IdCard size={17} /><span><strong>Personal information</strong><small>Profile and scheduling hours</small></span><ChevronRight size={15} /></button>
        <button data-active={tab === 'voice'} onClick={() => setTab('voice')}><AudioLines size={17} /><span><strong>LION voice commands</strong><small>{LION_COMMAND_GROUPS.reduce((sum, group) => sum + group.commands.length, 0)} available commands</small></span><ChevronRight size={15} /></button>
        <button data-active={tab === 'notifications'} onClick={() => setTab('notifications')}><Bell size={17} /><span><strong>Notifications</strong><small>{remindersEnabled ? 'LION reminders active' : 'Reminders currently paused'}</small></span><ChevronRight size={15} /></button>
        <div className="settings-nav-spacer" />
        <button className="settings-signout" onClick={onLogout}><LogOut size={17} /><span><strong>Sign out</strong><small>End this browser session</small></span></button>
      </aside>

      <div className="settings-content">
        {tab === 'profile' && <form className="profile-settings" onSubmit={saveProfile}>
          <div className="settings-section-head"><div><span>PERSONAL PROFILE</span><h2>Your information</h2><p>LION uses these details to personalize greetings, time zones, and schedule suggestions.</p></div><div className="profile-photo"><div>{initials}</div><button type="button" title="Profile photos coming soon"><Pencil size={13} /></button></div></div>
          <div className="settings-form-grid">
            <label className="settings-field full"><span>Full name</span><div><UserRound size={16} /><input value={profile.name} onChange={event => update('name', event.target.value)} /></div></label>
            <label className="settings-field"><span>Email address</span><div className="readonly"><Mail size={16} /><input value={profile.email} readOnly /><LockKeyhole size={13} /></div><small>Managed securely by Supabase Auth.</small></label>
            <label className="settings-field"><span>Phone number</span><div><Phone size={16} /><input value={profile.phone} onChange={event => update('phone', event.target.value)} placeholder="+233…" /></div></label>
            <label className="settings-field"><span>Account type</span><div><IdCard size={16} /><select value={profile.role} onChange={event => update('role', event.target.value)}><option>Personal</option><option>Student</option><option>Professional</option><option>Freelancer</option><option>Business owner</option></select></div></label>
            <label className="settings-field"><span>Location</span><div><MapPin size={16} /><input value={profile.location} onChange={event => update('location', event.target.value)} placeholder="City, country" /></div></label>
            <label className="settings-field full"><span>Time zone</span><div><Globe2 size={16} /><select value={profile.timezone} onChange={event => update('timezone', event.target.value)}><option value="Africa/Accra">Africa/Accra · Greenwich Mean Time</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New York</option><option value="America/Los_Angeles">America/Los Angeles</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Asia/Kolkata">Asia/Kolkata</option><option value="Asia/Tokyo">Asia/Tokyo</option><option value={profile.timezone}>{profile.timezone}</option></select></div></label>
          </div>
          <div className="schedule-preferences"><div className="schedule-pref-head"><Clock3 size={17} /><div><strong>Usual scheduling hours</strong><span>LION keeps flexible tasks inside this daily window.</span></div></div><div className="schedule-time-fields"><label><span>Start my day</span><input type="time" value={profile.workStart} onChange={event => update('workStart', event.target.value)} /></label><ArrowRight size={16} /><label><span>End my day</span><input type="time" value={profile.workEnd} onChange={event => update('workEnd', event.target.value)} /></label></div></div>
          <div className="settings-save-row"><span>{saved && <><CircleCheck size={15} /> All changes saved</>}</span><button className="button primary" type="submit"><Save size={16} /> Save personal information</button></div>
        </form>}

        {tab === 'voice' && <div className="voice-settings-page">
          <div className="settings-section-head voice-head"><div><span>LION COMMAND LIBRARY</span><h2>Everything you can ask LION</h2><p>Start spoken requests with the wake name “Lion.” Typed requests do not require the wake name.</p></div><button className="button ai-button" onClick={() => window.dispatchEvent(new CustomEvent('open-lion-assistant'))}><Mic size={16} /> Open LION</button></div>
          <div className="wake-word-settings"><div className="wake-word-orb"><AudioLines size={23} /></div><div><span>WAKE NAME</span><strong>“LION”</strong><p>Open the voice panel once, enable the microphone, and then say “Lion” before each command.</p></div><span className="wake-active"><i /> Active</span></div>
          <div className="command-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search all LION commands…" /><kbd>{LION_COMMAND_GROUPS.reduce((sum, group) => sum + group.commands.length, 0)} commands</kbd></div>
          <div className="command-groups">{filteredGroups.map(group => { const Icon = group.icon; return <section className="command-group" key={group.title}><div className={`command-group-title ${group.color}`}><Icon size={16} /><div><strong>{group.title}</strong><span>{group.commands.length} commands</span></div></div><div>{group.commands.map(([label, command]) => <article className="command-row" key={command}><div><strong>{label}</strong><code>{command}</code></div><button onClick={() => copyCommand(command)} title="Copy command"><Copy size={14} /></button></article>)}</div></section>; })}</div>
          {!filteredGroups.length && <div className="no-commands"><Search size={25} /><strong>No matching commands</strong><span>Try searching for tasks, meetings, reminders, or availability.</span></div>}
        </div>}

        {tab === 'notifications' && <div className="notification-settings-page">
          <div className="settings-section-head"><div><span>LION REMINDERS</span><h2>Task and event notifications</h2><p>Let LION tell you exactly what to do when a scheduled activity begins.</p></div></div>
          <div className={`notification-setting-card ${remindersEnabled ? 'active' : ''}`}><div className="notification-setting-icon"><Bell size={22} /></div><div><strong>Schedule reminders</strong><p>{remindersEnabled ? 'Voice and in-app reminders are monitoring your schedule.' : 'Reminders are paused. Enable them to receive spoken instructions at task time.'}</p></div><span><i /> {remindersEnabled ? 'Active' : 'Paused'}</span></div>
          <button className="button primary" onClick={onOpenReminders}><Settings size={16} /> Open reminder controls</button>
          <div className="notification-info"><ShieldCheck size={17} /><div><strong>Browser permission required</strong><p>SmartSchedule must remain open in a browser tab for precise web reminders. Browser notifications can appear while the tab is in the background.</p></div></div>
        </div>}
      </div>
    </section>
  </>;
}

function ReminderCenter({ items, enabled, onEnable, onDisable, onTest, onClose }) {
  const upcoming = items
    .filter(item => item.kind !== 'availability' && item.status !== 'done')
    .map(item => ({ item, time: new Date(item.kind === 'event' ? item.start : item.scheduledStart || item.deadline).getTime() }))
    .filter(entry => Number.isFinite(entry.time) && entry.time >= Date.now())
    .sort((a, b) => a.time - b.time)[0];
  const browserPermission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  return <section className="reminder-center">
    <div className="reminder-center-head"><div className="reminder-bell"><Bell size={18} /></div><div><strong>LION reminders</strong><span>{enabled ? 'Watching your schedule' : 'Currently paused'}</span></div><button onClick={onClose}><X size={18} /></button></div>
    <div className={`reminder-status ${enabled ? 'active' : ''}`}><span><i /> {enabled ? 'Voice reminders are active' : 'Never miss a scheduled task'}</span><button onClick={enabled ? onDisable : onEnable}>{enabled ? 'Pause' : 'Enable'}</button></div>
    <div className="next-reminder"><span>Next reminder</span>{upcoming ? <><strong>{upcoming.item.title}</strong><small>{dayLabel(new Date(upcoming.time))} at {formatTime(new Date(upcoming.time))}</small></> : <><strong>No upcoming activity</strong><small>Add a scheduled task to create a reminder.</small></>}</div>
    <div className="reminder-features"><div><Volume2 size={15} /><span><strong>Spoken instructions</strong><small>LION says what to do, priority, and planned duration.</small></span></div><div><Bell size={15} /><span><strong>Browser alert</strong><small>{browserPermission === 'granted' ? 'Permission granted' : browserPermission === 'denied' ? 'Blocked — enable in browser settings' : browserPermission === 'unsupported' ? 'In-app alerts only' : 'Permission requested when enabled'}</small></span></div></div>
    <button className="test-reminder-button" onClick={onTest}><AudioLines size={16} /> Test LION reminder now</button>
    <p>Keep SmartSchedule open in a browser tab for precise web reminders. Browser notifications also appear when the tab is in the background.</p>
  </section>;
}

function DueReminder({ alert, onDismiss, onSnooze, onComplete }) {
  const { item, message, test } = alert;
  return <div className="due-reminder" role="alertdialog" aria-label="Task due reminder">
    <div className="due-pulse"><Bell size={22} /></div>
    <div className="due-reminder-copy"><span>{test ? 'LION TEST REMINDER' : 'LION · IT’S TIME'}</span><h3>{item.title}</h3><p>{message}</p></div>
    <button className="due-close" onClick={onDismiss}><X size={18} /></button>
    <div className="due-actions">{!test && <button className="button secondary" onClick={onSnooze}><Clock3 size={15} /> Snooze 10 min</button>}<button className="button primary" onClick={onComplete}>{test || item.kind === 'event' ? 'Got it' : <><Check size={15} /> Mark complete</>}</button></div>
  </div>;
}

function VoiceAssistant({ onCommand, user }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState(`Hi ${user.name.split(/\s+/)[0]} — I’m LION. Enable the microphone, then say “Lion” followed by your command.`);
  const [typed, setTyped] = useState('');
  const [muted, setMuted] = useState(false);
  const [wakeMode, setWakeMode] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);
  const openRef = useRef(false);
  const wakeModeRef = useRef(true);
  const mutedRef = useRef(false);
  const keepListeningRef = useRef(false);
  const pausedForSpeechRef = useRef(false);
  const restartTimerRef = useRef(null);
  const supported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => () => {
    openRef.current = false;
    keepListeningRef.current = false;
    clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    const openLion = () => { setOpen(true); openRef.current = true; setReply('LION is ready. Tap the microphone, then begin your request with “Lion”.'); };
    window.addEventListener('open-lion-assistant', openLion);
    return () => window.removeEventListener('open-lion-assistant', openLion);
  }, []);

  function scheduleWakeRestart() {
    clearTimeout(restartTimerRef.current);
    if (!openRef.current || !wakeModeRef.current || !keepListeningRef.current) return;
    restartTimerRef.current = setTimeout(() => beginListening(true), 350);
  }

  function speak(text) {
    const shouldResume = keepListeningRef.current && wakeModeRef.current;
    if (mutedRef.current || !window.speechSynthesis) {
      pausedForSpeechRef.current = false;
      if (shouldResume) scheduleWakeRestart();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .98;
    utterance.pitch = 1.02;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => /en-GB|en_GB|English.*United Kingdom/i.test(`${v.lang} ${v.name}`)) || voices.find(v => v.lang?.startsWith('en')) || null;
    utterance.onend = () => {
      pausedForSpeechRef.current = false;
      if (shouldResume) scheduleWakeRestart();
    };
    utterance.onerror = () => {
      pausedForSpeechRef.current = false;
      if (shouldResume) scheduleWakeRestart();
    };
    window.speechSynthesis.speak(utterance);
  }

  function runCommand(value, source = 'typed') {
    const clean = value.trim();
    if (!clean) return;
    if (source !== 'voice' && listeningRef.current) {
      pausedForSpeechRef.current = true;
      recognitionRef.current?.stop();
      listeningRef.current = false;
      setListening(false);
    }
    if (source === 'voice' && wakeModeRef.current && !/\blion\b/i.test(clean)) {
      setTranscript(clean);
      setReply('Wake mode is active. Say “Lion” before your command.');
      return;
    }
    setHasInteracted(true);
    setTranscript(clean);
    setTyped('');
    setReply('LION is thinking…');
    Promise.resolve(onCommand(clean)).then(response => {
      const message = response || 'Done.';
      setReply(message);
      speak(message);
    }).catch(() => {
      pausedForSpeechRef.current = false;
      setReply('Something went wrong while handling that command. Please try again.');
      if (keepListeningRef.current) scheduleWakeRestart();
    });
  }

  function beginListening(useWakeMode = wakeModeRef.current) {
    if (!supported || listeningRef.current || recognitionRef.current || !openRef.current) return;
    window.speechSynthesis?.cancel();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-US';
    recognition.continuous = useWakeMode;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
      setReply(useWakeMode ? 'Wake mode is on. Say “Lion” followed by a command.' : 'Listening…');
    };
    recognition.onresult = event => {
      let words = '';
      let finalWords = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        words += event.results[i][0].transcript;
        if (event.results[i].isFinal) finalWords += event.results[i][0].transcript;
      }
      setTranscript(words);
      if (!finalWords.trim()) return;
      if (useWakeMode && !/\blion\b/i.test(finalWords)) {
        setReply('I’m standing by. Say “Lion” before your request.');
        return;
      }
      pausedForSpeechRef.current = true;
      recognition.stop();
      listeningRef.current = false;
      setListening(false);
      runCommand(finalWords, 'voice');
    };
    recognition.onerror = event => {
      listeningRef.current = false;
      setListening(false);
      const errors = {
        'not-allowed': 'Microphone access was blocked. Allow microphone permission in your browser, then try again.',
        'service-not-allowed': 'Voice recognition is blocked by this browser. You can type your command below.',
        'no-speech': useWakeMode ? 'LION is still standing by for the wake word.' : 'I didn’t hear anything. Tap the microphone and try again.',
        'audio-capture': 'No microphone was found. Check your device microphone or type below.',
        'network': 'The browser voice service could not connect. You can still type your command below.'
      };
      setReply(errors[event.error] || 'I couldn’t hear that clearly. Please try again.');
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(event.error)) keepListeningRef.current = false;
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      if (keepListeningRef.current && !pausedForSpeechRef.current) scheduleWakeRestart();
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      setReply('The microphone is already active. Wait a moment and try again.');
    }
  }

  function startListening() {
    setOpen(true);
    openRef.current = true;
    setHasInteracted(true);
    if (!supported) {
      setReply('Voice recognition is not available in this browser. Use Chrome or Edge, or type your request below.');
      return;
    }
    if (listeningRef.current) {
      keepListeningRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      setReply('Microphone paused. Tap it when you want LION to listen again.');
      return;
    }
    keepListeningRef.current = wakeModeRef.current;
    pausedForSpeechRef.current = false;
    beginListening(wakeModeRef.current);
  }

  function toggleWakeMode() {
    const next = !wakeModeRef.current;
    wakeModeRef.current = next;
    setWakeMode(next);
    keepListeningRef.current = next && listeningRef.current;
    if (!next && listeningRef.current) {
      recognitionRef.current?.stop();
      setReply('Wake mode is off. Tap the microphone for each command.');
    } else if (next) {
      setReply('Wake name set to LION. Tap the microphone once, then begin commands with “Lion”.');
    }
  }

  function closePanel() {
    openRef.current = false;
    keepListeningRef.current = false;
    pausedForSpeechRef.current = false;
    clearTimeout(restartTimerRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    listeningRef.current = false;
    setListening(false);
    setOpen(false);
  }

  const quickCommands = ['What’s on today?', 'Show my tasks', 'Optimize my day'];
  return (
    <div className={`voice-assistant ${open ? 'is-open' : ''}`}>
      {open && <section className="voice-panel" aria-label="LION voice assistant">
        <div className="voice-panel-head">
          <div className="voice-avatar"><AudioLines size={19} /></div>
          <div><strong>LION</strong><span><i /> {listening ? 'Listening for “Lion”' : 'SmartSchedule voice AI'}</span></div>
          <button className="voice-sound" onClick={() => { const next = !mutedRef.current; mutedRef.current = next; setMuted(next); window.speechSynthesis?.cancel(); }} aria-label={muted ? 'Turn voice on' : 'Mute voice'}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
          <button className="voice-close" onClick={closePanel}><X size={18} /></button>
        </div>
        <button className={`wake-mode-row ${wakeMode ? 'active' : ''}`} onClick={toggleWakeMode}>
          <span><Sparkles size={14} /><span><strong>Wake name: LION</strong><small>{wakeMode ? 'Say “Lion” before every voice command' : 'Tap microphone for each command'}</small></span></span>
          <i><b /></i>
        </button>
        <div className="voice-conversation">
          <div className="assistant-bubble"><Sparkles size={14} /><p>{reply}</p></div>
          {transcript && <div className="user-bubble">“{transcript}”</div>}
          {listening && <div className="voice-wave" aria-label="Listening"><span /><span /><span /><span /><span /></div>}
        </div>
        {!hasInteracted && <div className="voice-hint"><strong>Try saying</strong><span>“Lion, add task finish my report tomorrow for one hour, high priority.”</span></div>}
        <div className="voice-access-note"><Check size={13} /><span><strong>Full schedule access</strong> Tasks, events, deadlines, priorities, availability, and views</span></div>
        <div className="voice-quick-actions">{quickCommands.map(command => <button key={command} onClick={() => runCommand(command)}>{command}</button>)}</div>
        <form className="voice-input" onSubmit={event => { event.preventDefault(); runCommand(typed); }}>
          <input value={typed} onChange={event => setTyped(event.target.value)} placeholder="Or type anything for LION…" />
          <button type="submit" disabled={!typed.trim()}><SendHorizontal size={16} /></button>
        </form>
        <button className={`voice-main-mic ${listening ? 'listening' : ''}`} onClick={startListening}>
          {listening ? <MicOff size={22} /> : <Mic size={22} />}
          <span>{listening ? 'LION is listening · Tap to pause' : supported ? wakeMode ? 'Enable LION wake mode' : 'Tap to speak' : 'Voice unavailable'}</span>
        </button>
        <small className="voice-privacy">For browser security, microphone access starts after one tap. Wake listening remains active while this panel is open.</small>
      </section>}
      {!open && <button className="voice-fab" onClick={startListening} aria-label="Open LION voice assistant"><span><Mic size={21} /></span><strong>Ask LION</strong></button>}
    </div>
  );
}

function MobileBottomNav({ page, navigate, onAdd }) {
  return <nav className="mobile-bottom-nav"><button data-active={page === 'plan'} onClick={() => navigate('plan')}><LayoutDashboard size={20} /><span>Today</span></button><button data-active={page === 'tasks'} onClick={() => navigate('tasks')}><CheckSquare2 size={20} /><span>Tasks</span></button><button className="mobile-add" onClick={onAdd}><Plus size={23} /></button><button data-active={page === 'calendar'} onClick={() => navigate('calendar')}><CalendarDays size={20} /><span>Week</span></button><button data-active={page === 'settings'} onClick={() => navigate('settings')}><UserRound size={20} /><span>Profile</span></button></nav>;
}

function Toast({ toast }) {
  return <div className={`toast ${toast.type}`}><span>{toast.type === 'neutral' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}</span>{toast.message}</div>;
}

function mapSupabaseUser(authUser, profile = null) {
  const metadata = authUser?.user_metadata || {};
  return {
    id: authUser.id,
    name: profile?.full_name || metadata.name || authUser.email?.split('@')[0] || 'SmartSchedule user',
    email: profile?.email || authUser.email || '',
    phone: profile?.phone || metadata.phone || '',
    role: profile?.role || metadata.role || 'Personal',
    location: profile?.location || metadata.location || '',
    timezone: profile?.timezone || metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Accra',
    workStart: (profile?.work_start || metadata.work_start || '08:00').slice(0, 5),
    workEnd: (profile?.work_end || metadata.work_end || '18:00').slice(0, 5),
    createdAt: profile?.created_at || authUser.created_at
  };
}

function SmartScheduleRoot() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [databaseError, setDatabaseError] = useState(null);

  async function loadProfile(authUser) {
    if (!authUser) { setUser(null); setLoading(false); return null; }
    setDatabaseError(null);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (error) {
      setDatabaseError(error);
      setLoading(false);
      return null;
    }
    let profile = data;
    if (!profile) {
      const metadata = authUser.user_metadata || {};
      const row = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: metadata.name || authUser.email?.split('@')[0] || '',
        phone: metadata.phone || '',
        role: metadata.role || 'Personal',
        location: metadata.location || '',
        timezone: metadata.timezone || 'Africa/Accra',
        work_start: metadata.work_start || '08:00',
        work_end: metadata.work_end || '18:00'
      };
      const result = await supabase.from('profiles').upsert(row).select().single();
      if (result.error) {
        setDatabaseError(result.error);
        setLoading(false);
        return null;
      }
      profile = result.data;
    }
    const mapped = mapSupabaseUser(authUser, profile);
    setUser(mapped);
    setLoading(false);
    return mapped;
  }

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let alive = true;
    (async () => {
      const { error: schemaError } = await supabase.from('profiles').select('id').limit(1);
      if (!alive) return;
      if (schemaError?.code === 'PGRST205' || schemaError?.message?.includes("Could not find the table")) {
        setDatabaseError(schemaError);
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session?.user) loadProfile(data.session.user);
      else setLoading(false);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive || event === 'INITIAL_SESSION') return;
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setTimeout(() => {
        if (!alive) return;
        if (session?.user) loadProfile(session.user);
        else { setUser(null); setLoading(false); setDatabaseError(null); }
      }, 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  async function updateUser(updates) {
    const row = {
      full_name: updates.name,
      phone: updates.phone || '',
      role: updates.role || 'Personal',
      location: updates.location || '',
      timezone: updates.timezone || 'Africa/Accra',
      work_start: updates.workStart || '08:00',
      work_end: updates.workEnd || '18:00'
    };
    const { data, error } = await supabase.from('profiles').update(row).eq('id', user.id).select().single();
    if (error) throw error;
    await supabase.auth.updateUser({ data: { name: row.full_name, phone: row.phone, role: row.role, location: row.location, timezone: row.timezone, work_start: row.work_start, work_end: row.work_end } });
    const { data: authData } = await supabase.auth.getUser();
    const mapped = mapSupabaseUser(authData.user, data);
    setUser(mapped);
    return mapped;
  }

  async function retryDatabase() {
    setLoading(true);
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      setDatabaseError(error);
      setLoading(false);
      return;
    }
    setDatabaseError(null);
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await loadProfile(data.session.user);
    else setLoading(false);
  }

  async function signOut() {
    window.speechSynthesis?.cancel();
    await supabase?.auth.signOut();
    setUser(null);
  }

  if (!isSupabaseConfigured) return <SupabaseSetupScreen title="Supabase credentials are missing" message="Add your project URL and publishable key to .env.local, then restart the app." />;
  if (loading) return <div className="auth-loading"><div className="brand-mark"><Sparkles size={20} /></div><span>Connecting securely to Supabase…</span></div>;
  if (recoveryMode) return <AuthScreen recoveryMode onRecoveryComplete={() => setRecoveryMode(false)} />;
  if (databaseError) return <SupabaseSetupScreen title="Finish your Supabase database setup" message={databaseError.message} onRetry={retryDatabase} onSignOut={user ? signOut : null} />;
  return user ? <App user={user} onLogout={signOut} onUpdateUser={updateUser} /> : <AuthScreen />;
}

function SupabaseSetupScreen({ title, message, onRetry, onSignOut }) {
  return <main className="setup-screen"><div className="setup-card"><div className="setup-logo"><ShieldCheck size={24} /></div><span>SUPABASE CONNECTION</span><h1>{title}</h1><p>{message}</p><div className="setup-steps"><strong>One-time setup</strong><ol><li>Open your Supabase project dashboard.</li><li>Go to <b>SQL Editor</b> and create a new query.</li><li>Paste and run the included <code>supabase-schema.sql</code> file.</li><li>Return here and select Retry connection.</li></ol></div><div className="setup-actions">{onSignOut && <button className="button secondary" onClick={onSignOut}>Sign out</button>}{onRetry && <button className="button primary" onClick={onRetry}><RotateCcw size={16} /> Retry connection</button>}</div></div></main>;
}

function AuthScreen({ recoveryMode = false, onRecoveryComplete }) {
  const [mode, setMode] = useState(recoveryMode ? 'reset' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Personal');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Accra');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(recoveryMode ? 'Recovery link verified. Create your new password.' : '');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      if (mode === 'reset') {
        if (password.length < 8) return setError('Use at least 8 characters for your new password.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) return setError(updateError.message);
        setNotice('Your password has been updated securely.');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => onRecoveryComplete?.(), 700);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setError('Enter a valid email address.');

      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: window.location.origin });
        if (resetError) return setError(resetError.message);
        setNotice('Check your email for a secure Supabase password-reset link.');
        return;
      }

      if (mode === 'signup') {
        if (name.trim().length < 2) return setError('Enter your name.');
        if (password.length < 8) return setError('Password must contain at least 8 characters.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              name: name.trim(), phone: phone.trim(), role, location: location.trim(), timezone,
              work_start: '08:00', work_end: '18:00'
            }
          }
        });
        if (signUpError) return setError(signUpError.message);
        if (!data.session) {
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
          setNotice('Account created. Check your email to confirm it before signing in.');
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) return setError(signInError.message === 'Invalid login credentials' ? 'Incorrect email or password.' : signInError.message);
    } catch (authError) {
      setError(authError.message || 'Unable to connect to Supabase. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  return <main className="auth-shell">
    <section className="auth-showcase">
      <div className="auth-brand"><div className="brand-mark"><Sparkles size={20} /></div><span>SmartSchedule</span></div>
      <div className="auth-copy"><span className="auth-eyebrow"><ShieldCheck size={14} /> Secure personal workspace</span><h1>Your time,<br />organized around <em>you.</em></h1><p>Plan focused days, protect important work, and let LION keep your schedule moving.</p></div>
      <div className="auth-preview-card">
        <div className="auth-preview-top"><span>Today’s smart plan</span><small><i /> Balanced</small></div>
        <div className="auth-preview-event violet"><b>09:00</b><span><strong>Finish product proposal</strong><small>Deep work · 90 min</small></span><Check size={14} /></div>
        <div className="auth-preview-break"><span /> 15-minute reset <span /></div>
        <div className="auth-preview-event green"><b>10:45</b><span><strong>Team stand-up</strong><small>Fixed event · 30 min</small></span><CalendarDays size={14} /></div>
        <div className="auth-lion-note"><AudioLines size={17} /><span><strong>LION is ready</strong><small>Voice scheduling and timely reminders</small></span></div>
      </div>
      <div className="auth-trust"><ShieldCheck size={15} /><span><strong>Protected by Supabase</strong><small>Secure authentication, encrypted transport, and row-level data isolation.</small></span></div>
    </section>

    <section className="auth-form-side">
      <div className="auth-mobile-brand"><div className="brand-mark"><Sparkles size={18} /></div>SmartSchedule</div>
      <div className="auth-form-card">
        <div className="auth-form-heading">
          <span>{isSignup ? 'CREATE YOUR WORKSPACE' : mode === 'forgot' || isReset ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</span>
          <h2>{isSignup ? 'Start planning smarter' : mode === 'forgot' ? 'Reset your password' : isReset ? 'Choose a new password' : 'Sign in to SmartSchedule'}</h2>
          <p>{isSignup ? 'Create an account to save your personal schedule.' : mode === 'forgot' ? 'Enter your account email to continue.' : isReset ? 'Your new password must contain at least 8 characters.' : 'Continue to your tasks, calendar, and LION assistant.'}</p>
        </div>

        {(mode === 'signin' || mode === 'signup') && <div className="auth-tabs"><button data-active={mode === 'signin'} onClick={() => switchMode('signin')}>Sign in</button><button data-active={mode === 'signup'} onClick={() => switchMode('signup')}>Create account</button></div>}

        <form className="auth-form" onSubmit={submit}>
          {isSignup && <label><span>Full name</span><div className="auth-input"><UserRound size={17} /><input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></div></label>}
          {mode !== 'reset' && <label><span>Email address</span><div className="auth-input"><Mail size={17} /><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></div></label>}
          {isSignup && <div className="auth-profile-grid">
            <label><span>Phone <small>Optional</small></span><div className="auth-input"><Phone size={16} /><input value={phone} onChange={event => setPhone(event.target.value)} placeholder="+233…" autoComplete="tel" /></div></label>
            <label><span>I use it for</span><div className="auth-input"><IdCard size={16} /><select value={role} onChange={event => setRole(event.target.value)}><option>Personal</option><option>Student</option><option>Professional</option><option>Freelancer</option><option>Business owner</option></select></div></label>
            <label><span>Location <small>Optional</small></span><div className="auth-input"><MapPin size={16} /><input value={location} onChange={event => setLocation(event.target.value)} placeholder="City, country" autoComplete="address-level2" /></div></label>
            <label><span>Time zone</span><div className="auth-input"><Globe2 size={16} /><select value={timezone} onChange={event => setTimezone(event.target.value)}><option value="Africa/Accra">Accra · GMT</option><option value="Europe/London">London</option><option value="America/New_York">New York</option><option value="America/Los_Angeles">Los Angeles</option><option value="Asia/Dubai">Dubai</option><option value="Asia/Kolkata">India</option><option value="Asia/Tokyo">Tokyo</option><option value={timezone}>{timezone}</option></select></div></label>
          </div>}
          {mode !== 'forgot' && <label><span>{isReset ? 'New password' : 'Password'}</span><div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete={isSignup || isReset ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
          {(isSignup || isReset) && <label><span>Confirm password</span><div className="auth-input"><KeyRound size={17} /><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" /></div></label>}
          {mode === 'signin' && <div className="auth-form-options"><label><input type="checkbox" defaultChecked /> Keep me signed in</label><button type="button" onClick={() => switchMode('forgot')}>Forgot password?</button></div>}
          {error && <div className="auth-message error"><CircleAlert size={15} /> {error}</div>}
          {notice && <div className="auth-message success"><CircleCheck size={15} /> {notice}</div>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? <span className="loader" /> : mode === 'signup' ? <UserPlus size={17} /> : mode === 'forgot' ? <KeyRound size={17} /> : isReset ? <ShieldCheck size={17} /> : <LogOut size={17} />}{submitting ? 'Please wait…' : mode === 'signup' ? 'Create my account' : mode === 'forgot' ? 'Continue' : isReset ? 'Update password' : 'Sign in securely'}</button>
        </form>

        {(mode === 'forgot' || isReset) && <button className="auth-back" onClick={() => switchMode('signin')}><ChevronLeft size={16} /> Back to sign in</button>}
        {mode === 'signin' && <div className="supabase-auth-badge"><ShieldCheck size={17} /><span><strong>Authentication by Supabase</strong><small>Your session is securely stored and automatically refreshed.</small></span></div>}
        <p className="auth-terms">By continuing, you agree to SmartSchedule’s Terms and Privacy Policy.</p>
      </div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<SmartScheduleRoot />);
