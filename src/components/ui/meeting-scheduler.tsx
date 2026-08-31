import * as React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, Video, MapPin, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface MeetingSchedulerProps {
  title?: string;
  description?: string;
  scheduleButtonText?: string;
  cancelButtonText?: string;
  initialStartDate?: Date;
  initialEndDate?: Date;
  onSchedule: (details: {
    startDate: Date | null;
    endDate: Date | null;
    startTime?: string;
    endTime?: string;
    meetingTitle?: string;
    locationType?: string;
    attendees?: string[];
    timezone?: string;
    aiNotes: boolean;
  }) => void;
  onCancel: () => void;
}

const TIME_OPTIONS = [
  "12:00 AM","12:30 AM","1:00 AM","1:30 AM","2:00 AM","2:30 AM",
  "3:00 AM","3:30 AM","4:00 AM","4:30 AM","5:00 AM","5:30 AM",
  "6:00 AM","6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM",
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
  "6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM",
  "9:00 PM","9:30 PM","10:00 PM","10:30 PM","11:00 PM","11:30 PM"
];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date, weekStartsOn: number = 1): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfWeek(d: Date, weekStartsOn: number = 1): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = (weekStartsOn + 6 - day) % 7;
  result.setDate(result.getDate() + diff);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + months);
  return result;
}

function subMonths(d: Date, months: number): Date {
  return addMonths(d, -months);
}

function eachDayOfInterval({ start, end }: { start: Date; end: Date }): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

function formatDate(d: Date, pattern: string): string {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (pattern === "MMMM yyyy") return `${months[d.getMonth()]} ${d.getFullYear()}`;
  if (pattern === "MMMM d, yyyy") return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (pattern === "MMM d") return `${monthsShort[d.getMonth()]} ${d.getDate()}`;
  if (pattern === "d") return String(d.getDate());
  return d.toLocaleDateString();
}

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({
  title = "Schedule a meeting",
  description = "Create your next meeting easily.",
  scheduleButtonText = "Schedule",
  cancelButtonText = "Cancel",
  initialStartDate,
  initialEndDate,
  onSchedule,
  onCancel,
}) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialStartDate || new Date()));
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate || new Date());
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || null);
  const [startTime, setStartTime] = useState("9:00 AM");
  const [endTime, setEndTime] = useState("10:00 AM");
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [locationType, setLocationType] = useState<"meet" | "zoom" | "in_person">("meet");
  const [attendeeDraft, setAttendeeDraft] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [aiNotes, setAiNotes] = useState(true);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), 1),
    end: endOfWeek(endOfMonth(currentMonth), 1),
  }), [currentMonth]);

  const handleDateClick = (day: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day); setEndDate(null);
    } else if (isBefore(day, startDate)) {
      setStartDate(day);
    } else {
      setEndDate(day);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const handleAddAttendee = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (("key" in e && e.key === "Enter") || !("key" in e)) {
      if (attendeeDraft.trim() && !attendees.includes(attendeeDraft.trim())) {
        setAttendees([...attendees, attendeeDraft.trim()]);
        setAttendeeDraft("");
      }
    }
  };

  const setPresetDuration = (minutes: number) => {
    const startIdx = TIME_OPTIONS.indexOf(startTime);
    if (startIdx >= 0) {
      const step = Math.round(minutes / 30);
      setEndTime(TIME_OPTIONS[Math.min(TIME_OPTIONS.length - 1, startIdx + step)]);
    }
  };

  const eventSummary = useMemo(() => {
    if (!startDate) return "Select a date to schedule.";
    const startFmt = formatDate(startDate, "MMM d");
    if (!endDate || isSameDay(startDate, endDate)) return `Event: ${startFmt}, from ${startTime} - ${endTime}`;
    return `Event: ${startFmt} - ${formatDate(endDate, "MMM d")}, from ${startTime} - ${endTime}`;
  }, [startDate, endDate, startTime, endTime]);

  const handleConfirm = () => {
    onSchedule({ startDate, endDate: endDate || startDate, startTime, endTime, meetingTitle: meetingTitle || "Untitled Meeting", locationType, attendees, aiNotes });
  };

  const handleReset = () => {
    setStartDate(new Date()); setEndDate(null); setStartTime("9:00 AM"); setEndTime("10:00 AM");
    setMeetingTitle(""); setAttendees([]); onCancel();
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 shadow-2xl select-none">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="h-10 w-10 rounded-full bg-[var(--hover)] grid place-items-center shrink-0">
          <Clock className="w-5 h-5 text-[var(--secondary)]" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text)]">{title}</h2>
          <p className="text-xs sm:text-sm text-[var(--secondary)] mt-0.5">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-8">
        {/* Calendar */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3 px-1">
            <button onClick={prevMonth} className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--secondary)] hover:bg-[var(--hover)] transition cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text)]">{formatDate(currentMonth, "MMMM yyyy")}</h3>
            <button onClick={nextMonth} className="h-8 w-8 rounded-full flex items-center justify-center text-[var(--secondary)] hover:bg-[var(--hover)] transition cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold text-[var(--muted)] mb-2">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center text-xs sm:text-sm">
            {days.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isStart = startDate && isSameDay(day, startDate);
              const isEnd = endDate && isSameDay(day, endDate);
              const isInRange = Boolean(startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate));

              let rangeClass = "";
              if (isInRange) rangeClass = "bg-[var(--hover)] text-[var(--text)]";
              else if (isStart && endDate && !isSameDay(startDate, endDate)) rangeClass = "bg-gradient-to-r from-transparent to-[var(--hover)]";
              else if (isEnd && startDate && !isSameDay(startDate, endDate)) rangeClass = "bg-gradient-to-l from-transparent to-[var(--hover)]";

              return (
                <div key={day.toString()} className={cn("relative flex items-center justify-center h-10 w-full", rangeClass)}>
                  <button
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center font-medium transition-all duration-150 cursor-pointer relative z-10",
                      !isCurrentMonth && "text-[var(--muted)]/40",
                      isCurrentMonth && "text-[var(--text)] hover:bg-[var(--hover)]",
                      (isStart || isEnd) && "bg-[var(--text)] text-[var(--bg)] font-bold shadow-md",
                      isInRange && "font-semibold"
                    )}
                  >
                    {formatDate(day, "d")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inputs */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Start */}
            <div className="relative">
              <Label className="text-xs font-semibold text-[var(--text)]">Start date*</Label>
              <div className="flex items-center justify-between mt-1 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                <span className="text-xs sm:text-sm font-medium text-[var(--text)]">{startDate ? formatDate(startDate, "MMMM d, yyyy") : "Select"}</span>
                <button onClick={() => { setStartTimeOpen(!startTimeOpen); setEndTimeOpen(false); }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--hover)] text-xs font-semibold text-[var(--text)] hover:opacity-80 transition cursor-pointer">{startTime}</button>
              </div>
              <AnimatePresence>
                {startTimeOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-50 w-36 max-h-48 overflow-y-auto rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-1 text-xs">
                    {TIME_OPTIONS.map((t) => (
                      <button key={t} onClick={() => { setStartTime(t); setStartTimeOpen(false); }}
                        className={cn("w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer",
                          startTime === t ? "bg-[var(--text)] text-[var(--bg)] font-bold" : "hover:bg-[var(--hover)]")}>{t}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* End */}
            <div className="relative">
              <Label className="text-xs font-semibold text-[var(--text)]">End date*</Label>
              <div className="flex items-center justify-between mt-1 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                <span className="text-xs sm:text-sm font-medium text-[var(--text)]">{endDate ? formatDate(endDate, "MMMM d, yyyy") : (startDate ? formatDate(startDate, "MMMM d, yyyy") : "Select")}</span>
                <button onClick={() => { setEndTimeOpen(!endTimeOpen); setStartTimeOpen(false); }}
                  className="px-2.5 py-1 rounded-lg bg-[var(--hover)] text-xs font-semibold text-[var(--text)] hover:opacity-80 transition cursor-pointer">{endTime}</button>
              </div>
              <AnimatePresence>
                {endTimeOpen && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 z-50 w-36 max-h-48 overflow-y-auto rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-1 text-xs">
                    {TIME_OPTIONS.map((t) => (
                      <button key={t} onClick={() => { setEndTime(t); setEndTimeOpen(false); }}
                        className={cn("w-full text-left px-2.5 py-1.5 rounded-lg transition cursor-pointer",
                          endTime === t ? "bg-[var(--text)] text-[var(--bg)] font-bold" : "hover:bg-[var(--hover)]")}>{t}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Duration pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[{ label: "15m", mins: 15 },{ label: "30m", mins: 30 },{ label: "45m", mins: 45 },{ label: "1 hr", mins: 60 },{ label: "2 hr", mins: 120 }].map((p) => (
                <button key={p.label} onClick={() => setPresetDuration(p.mins)}
                  className="px-2 py-0.5 rounded-lg bg-[var(--hover)] text-[11px] font-semibold text-[var(--secondary)] hover:text-[var(--text)] transition cursor-pointer shrink-0">+{p.label}</button>
              ))}
            </div>

            {/* AI Notes */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <Label className="text-xs font-semibold text-[var(--text)] cursor-pointer">Enable AI notes</Label>
              </div>
              <Switch checked={aiNotes} onCheckedChange={setAiNotes} />
            </div>

            {/* Advanced options */}
            <div>
              <button onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="text-[11px] font-semibold text-[var(--secondary)] hover:text-[var(--text)] transition cursor-pointer">
                {showMoreOptions ? "− Hide Details" : "+ Add Meeting Title & Attendees"}
              </button>
              {showMoreOptions && (
                <div className="mt-2.5 p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] space-y-2.5 text-xs">
                  <input type="text" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Meeting Title..."
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs outline-none focus:border-[var(--text)]" />
                  <div className="grid grid-cols-3 gap-1 text-[11px]">
                    {[
                      { id: "meet", label: "Google Meet", icon: Video },
                      { id: "zoom", label: "Zoom Call", icon: Video },
                      { id: "in_person", label: "In Person", icon: MapPin }
                    ].map((loc) => (
                      <button key={loc.id} onClick={() => setLocationType(loc.id as any)}
                        className={cn("flex items-center justify-center gap-1 py-1 rounded-lg border transition cursor-pointer",
                          locationType === loc.id ? "bg-[var(--text)] text-[var(--bg)] font-semibold border-transparent" : "border-[var(--border)] text-[var(--secondary)]")}>
                        <loc.icon className="w-3 h-3" /><span>{loc.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <input type="text" value={attendeeDraft} onChange={(e) => setAttendeeDraft(e.target.value)} onKeyDown={handleAddAttendee}
                        placeholder="Add attendee email..." className="flex-1 px-2.5 py-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs outline-none" />
                      <button onClick={handleAddAttendee} className="px-2.5 py-1 rounded-xl bg-[var(--hover)] font-semibold text-[11px] cursor-pointer">Add</button>
                    </div>
                    {attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attendees.map((att) => (
                          <span key={att} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--hover)] text-[10.5px] font-medium">
                            {att}<X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => setAttendees(attendees.filter(a => a !== att))} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--secondary)]">{eventSummary}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button onClick={handleReset} className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)] transition cursor-pointer">{cancelButtonText}</button>
              <button onClick={handleConfirm} className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--text)] text-[var(--bg)] hover:opacity-90 shadow-md active:scale-95 transition cursor-pointer">{scheduleButtonText}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
