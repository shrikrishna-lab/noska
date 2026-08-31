import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Grid3x3, List, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface Event {
  id: string; title: string; description?: string;
  startTime: Date; endTime: Date; color: string;
  category?: string; attendees?: string[]; tags?: string[];
}

export interface EventManagerProps {
  events?: Event[];
  onEventCreate?: (event: Omit<Event, "id">) => void;
  onEventUpdate?: (id: string, event: Partial<Event>) => void;
  onEventDelete?: (id: string) => void;
  categories?: string[];
  colors?: { name: string; value: string; bg: string; text: string }[];
  defaultView?: "month" | "week" | "day" | "list";
  className?: string;
  availableTags?: string[];
}

const defaultColors = [
  { name: "Blue", value: "blue", bg: "bg-blue-500", text: "text-blue-700" },
  { name: "Green", value: "green", bg: "bg-green-500", text: "text-green-700" },
  { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-purple-700" },
  { name: "Orange", value: "orange", bg: "bg-orange-500", text: "text-orange-700" },
  { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-pink-700" },
  { name: "Red", value: "red", bg: "bg-red-500", text: "text-red-700" },
];

function EventCard({ event, onEventClick, onDragStart, onDragEnd, getColorClasses, variant = "default" }: {
  event: Event; onEventClick: (e: Event) => void; onDragStart: (e: Event) => void; onDragEnd: () => void;
  getColorClasses: (c: string) => { bg: string; text: string }; variant?: "default" | "compact" | "detailed";
}) {
  const [hovered, setHovered] = useState(false);
  const cc = getColorClasses(event.color);
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const dur = () => {
    const m = Math.floor((event.endTime.getTime() - event.startTime.getTime()) / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };

  if (variant === "compact") {
    return (
      <div draggable onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} onClick={() => onEventClick(event)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="relative cursor-pointer">
        <div className={cn("rounded px-1.5 py-0.5 text-xs font-medium text-white truncate transition-all", cc.bg, hovered && "scale-105 shadow-lg z-10")}>{event.title}</div>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div draggable onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} onClick={() => onEventClick(event)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        className={cn("cursor-pointer rounded-lg p-3 text-white transition-all", cc.bg, hovered && "scale-[1.03] shadow-2xl")}>
        <div className="font-semibold">{event.title}</div>
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80"><Clock className="h-3 w-3" />{fmt(event.startTime)} - {fmt(event.endTime)}</div>
      </div>
    );
  }

  return (
    <div draggable onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} onClick={() => onEventClick(event)}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className="relative">
      <div className={cn("cursor-pointer rounded px-2 py-1 text-xs font-medium text-white truncate transition-all", cc.bg, hovered && "scale-105 shadow-lg z-10")}>{event.title}</div>
    </div>
  );
}

function MonthView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }: any) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const start = new Date(firstDay); start.setDate(start.getDate() - start.getDay());
  const days: Date[] = []; const cur = new Date(start);
  for (let i = 0; i < 42; i++) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  const forDay = (d: Date) => events.filter((e: Event) => { const ed = new Date(e.startTime); return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear(); });

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="border-r border-[var(--border)] last:border-r-0 p-2 text-center text-xs font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const de = forDay(day); const isCur = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={i} className={cn("min-h-20 border-b border-r border-[var(--border)] last:border-r-0 p-1 hover:bg-[var(--hover)] transition-colors", !isCur && "opacity-40")}
              onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(day)}>
              <div className={cn("mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs", isToday && "bg-[var(--text)] text-[var(--bg)] font-semibold")}>{day.getDate()}</div>
              <div className="space-y-1">{de.slice(0, 3).map((e: Event) => <EventCard key={e.id} event={e} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} getColorClasses={getColorClasses} variant="compact" />)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }: any) {
  const startOfWeek = new Date(currentDate); startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const forSlot = (d: Date, h: number) => events.filter((e: Event) => { const ed = new Date(e.startTime); return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear() && ed.getHours() === h; });

  return (
    <Card className="overflow-auto">
      <div className="grid grid-cols-8 border-b border-[var(--border)]">
        <div className="border-r border-[var(--border)] p-2 text-center text-xs font-medium">Time</div>
        {weekDays.map((d) => <div key={d.toISOString()} className="border-r border-[var(--border)] last:border-r-0 p-2 text-center text-xs font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}<div className="text-[10px] text-[var(--muted)]">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div>)}
      </div>
      <div className="grid grid-cols-8">
        {hours.map((h) => (
          <React.Fragment key={h}>
            <div className="border-b border-r border-[var(--border)] p-1 text-[10px] text-[var(--muted)]">{h.toString().padStart(2, "0")}:00</div>
            {weekDays.map((d) => (
              <div key={`${d.toISOString()}-${h}`} className="min-h-12 border-b border-r border-[var(--border)] last:border-r-0 p-0.5 hover:bg-[var(--hover)] transition-colors"
                onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(d, h)}>
                <div className="space-y-1">{forSlot(d, h).map((e: Event) => <EventCard key={e.id} event={e} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} getColorClasses={getColorClasses} />)}</div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}

function DayView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }: any) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const forHour = (h: number) => events.filter((e: Event) => { const ed = new Date(e.startTime); return ed.getDate() === currentDate.getDate() && ed.getMonth() === currentDate.getMonth() && ed.getFullYear() === currentDate.getFullYear() && ed.getHours() === h; });

  return (
    <Card className="overflow-auto">
      {hours.map((h) => (
        <div key={h} className="flex border-b border-[var(--border)] last:border-b-0" onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(currentDate, h)}>
          <div className="w-16 shrink-0 border-r border-[var(--border)] p-2 text-xs text-[var(--muted)]">{h.toString().padStart(2, "0")}:00</div>
          <div className="flex-1 min-h-12 p-1 hover:bg-[var(--hover)] transition-colors">
            <div className="space-y-1">{forHour(h).map((e: Event) => <EventCard key={e.id} event={e} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} getColorClasses={getColorClasses} />)}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

function ListView({ events, onEventClick, getColorClasses }: { events: Event[]; onEventClick: (e: Event) => void; getColorClasses: (c: string) => { bg: string; text: string } }) {
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  if (sorted.length === 0) return <div className="text-center py-12 text-sm text-[var(--muted)]">No events found.</div>;
  return (
    <div className="space-y-2">
      {sorted.map((e) => {
        const cc = getColorClasses(e.color);
        return (
          <div key={e.id} onClick={() => onEventClick(e)} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] cursor-pointer transition">
            <div className={cn("h-3 w-3 rounded-full shrink-0", cc.bg)} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text)] truncate">{e.title}</div>
              <div className="text-xs text-[var(--muted)]">{e.startTime.toLocaleDateString()} {e.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            {e.category && <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>}
          </div>
        );
      })}
    </div>
  );
}

export function EventManager({
  events: initialEvents = [], onEventCreate, onEventUpdate, onEventDelete,
  categories = ["Meeting", "Task", "Reminder", "Personal"],
  colors = defaultColors, defaultView = "month", className,
  availableTags = ["Important", "Urgent", "Work", "Personal", "Team", "Client"],
}: EventManagerProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "list">(defaultView);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({ title: "", description: "", color: colors[0].value, category: categories[0], tags: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const filteredEvents = useMemo(() => events.filter((e) => {
    if (searchQuery) { const q = searchQuery.toLowerCase(); if (!e.title.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q) && !e.category?.toLowerCase().includes(q) && !e.tags?.some(t => t.toLowerCase().includes(q))) return false; }
    if (selectedColors.length > 0 && !selectedColors.includes(e.color)) return false;
    if (selectedTags.length > 0 && !e.tags?.some(t => selectedTags.includes(t))) return false;
    if (selectedCategories.length > 0 && e.category && !selectedCategories.includes(e.category)) return false;
    return true;
  }), [events, searchQuery, selectedColors, selectedTags, selectedCategories]);

  const hasFilters = selectedColors.length > 0 || selectedTags.length > 0 || selectedCategories.length > 0;
  const clearFilters = () => { setSelectedColors([]); setSelectedTags([]); setSelectedCategories([]); setSearchQuery(""); };
  const getColorClasses = useCallback((v: string) => colors.find(c => c.value === v) || colors[0], [colors]);

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;
    const event: Event = { id: Math.random().toString(36).substring(2, 11), title: newEvent.title!, description: newEvent.description, startTime: newEvent.startTime!, endTime: newEvent.endTime!, color: newEvent.color || colors[0].value, category: newEvent.category, tags: newEvent.tags || [] };
    setEvents(prev => [...prev, event]); onEventCreate?.(event); setIsDialogOpen(false); setIsCreating(false);
    setNewEvent({ title: "", description: "", color: colors[0].value, category: categories[0], tags: [] });
  }, [newEvent, colors, categories, onEventCreate]);

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return;
    setEvents(prev => prev.map(e => e.id === selectedEvent.id ? selectedEvent : e));
    onEventUpdate?.(selectedEvent.id, selectedEvent); setIsDialogOpen(false); setSelectedEvent(null);
  }, [selectedEvent, onEventUpdate]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id)); onEventDelete?.(id); setIsDialogOpen(false); setSelectedEvent(null);
  }, [onEventDelete]);

  const handleDrop = useCallback((date: Date, hour?: number) => {
    if (!draggedEvent) return;
    const dur = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
    const newStart = new Date(date); if (hour !== undefined) newStart.setHours(hour, 0, 0, 0);
    const updated = { ...draggedEvent, startTime: newStart, endTime: new Date(newStart.getTime() + dur) };
    setEvents(prev => prev.map(e => e.id === draggedEvent.id ? updated : e));
    onEventUpdate?.(draggedEvent.id, updated); setDraggedEvent(null);
  }, [draggedEvent, onEventUpdate]);

  const navigateDate = useCallback((dir: "prev" | "next") => {
    setCurrentDate(prev => { const d = new Date(prev); if (view === "month") d.setMonth(prev.getMonth() + (dir === "next" ? 1 : -1)); else if (view === "week") d.setDate(prev.getDate() + (dir === "next" ? 7 : -7)); else d.setDate(prev.getDate() + (dir === "next" ? 1 : -1)); return d; });
  }, [view]);

  const toggleTag = (tag: string, creating: boolean) => {
    const setter = creating ? setNewEvent : setSelectedEvent;
    setter((prev: any) => prev ? { ...prev, tags: prev.tags?.includes(tag) ? prev.tags.filter((t: string) => t !== tag) : [...(prev.tags || []), tag] } : null);
  };

  const viewLabel = view === "month" ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : view === "week" ? `Week of ${currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : view === "day" ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "All Events";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="text-xl font-semibold sm:text-2xl">{viewLabel}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate("prev")} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => navigateDate("next")} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
            {(["month","week","day","list"] as const).map((v) => (
              <Button key={v} variant={view === v ? "secondary" : "ghost"} size="sm" onClick={() => setView(v)} className="h-8">
                {v === "month" && <><Calendar className="h-4 w-4" /><span className="ml-1">Month</span></>}
                {v === "week" && <><Grid3x3 className="h-4 w-4" /><span className="ml-1">Week</span></>}
                {v === "day" && <><Clock className="h-4 w-4" /><span className="ml-1">Day</span></>}
                {v === "list" && <><List className="h-4 w-4" /><span className="ml-1">List</span></>}
              </Button>
            ))}
          </div>
          <Button onClick={() => { setIsCreating(true); setIsDialogOpen(true); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />New Event</Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setSearchQuery("")}><X className="h-4 w-4" /></Button>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Colors{selectedColors.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{selectedColors.length}</Badge>}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Color</DropdownMenuLabel><DropdownMenuSeparator />
              {colors.map((c) => <DropdownMenuCheckboxItem key={c.value} checked={selectedColors.includes(c.value)} onCheckedChange={(ch) => setSelectedColors(prev => ch ? [...prev, c.value] : prev.filter(v => v !== c.value))}><div className="flex items-center gap-2"><div className={cn("h-3 w-3 rounded", c.bg)} />{c.name}</div></DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Tags{selectedTags.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{selectedTags.length}</Badge>}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel><DropdownMenuSeparator />
              {availableTags.map((t) => <DropdownMenuCheckboxItem key={t} checked={selectedTags.includes(t)} onCheckedChange={(ch) => setSelectedTags(prev => ch ? [...prev, t] : prev.filter(x => x !== t))}>{t}</DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />Categories{selectedCategories.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{selectedCategories.length}</Badge>}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel><DropdownMenuSeparator />
              {categories.map((c) => <DropdownMenuCheckboxItem key={c} checked={selectedCategories.includes(c)} onCheckedChange={(ch) => setSelectedCategories(prev => ch ? [...prev, c] : prev.filter(x => x !== c))}>{c}</DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2"><X className="h-4 w-4" />Clear</Button>}
        </div>
      </div>

      {/* Views */}
      {view === "month" && <MonthView currentDate={currentDate} events={filteredEvents} onEventClick={(e: Event) => { setSelectedEvent(e); setIsDialogOpen(true); }} onDragStart={setDraggedEvent} onDragEnd={() => setDraggedEvent(null)} onDrop={handleDrop} getColorClasses={getColorClasses} />}
      {view === "week" && <WeekView currentDate={currentDate} events={filteredEvents} onEventClick={(e: Event) => { setSelectedEvent(e); setIsDialogOpen(true); }} onDragStart={setDraggedEvent} onDragEnd={() => setDraggedEvent(null)} onDrop={handleDrop} getColorClasses={getColorClasses} />}
      {view === "day" && <DayView currentDate={currentDate} events={filteredEvents} onEventClick={(e: Event) => { setSelectedEvent(e); setIsDialogOpen(true); }} onDragStart={setDraggedEvent} onDragEnd={() => setDraggedEvent(null)} onDrop={handleDrop} getColorClasses={getColorClasses} />}
      {view === "list" && <ListView events={filteredEvents} onEventClick={(e: Event) => { setSelectedEvent(e); setIsDialogOpen(true); }} getColorClasses={getColorClasses} />}

      {/* Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isCreating ? "Create Event" : "Event Details"}</DialogTitle><DialogDescription>{isCreating ? "Add a new event" : "View and edit event"}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={isCreating ? (newEvent.title || "") : (selectedEvent?.title || "")} onChange={(e) => isCreating ? setNewEvent(prev => ({ ...prev, title: e.target.value })) : setSelectedEvent(prev => prev ? { ...prev, title: e.target.value } : null)} placeholder="Event title" /></div>
            <div className="space-y-2"><Label htmlFor="desc">Description</Label><Textarea id="desc" value={isCreating ? (newEvent.description || "") : (selectedEvent?.description || "")} onChange={(e) => isCreating ? setNewEvent(prev => ({ ...prev, description: e.target.value })) : setSelectedEvent(prev => prev ? { ...prev, description: e.target.value } : null)} placeholder="Description" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Time</Label><Input type="datetime-local" value={isCreating ? (newEvent.startTime ? new Date(newEvent.startTime.getTime() - newEvent.startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "") : selectedEvent ? new Date(selectedEvent.startTime.getTime() - selectedEvent.startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => { const d = new Date(e.target.value); isCreating ? setNewEvent(prev => ({ ...prev, startTime: d })) : setSelectedEvent(prev => prev ? { ...prev, startTime: d } : null); }} /></div>
              <div className="space-y-2"><Label>End Time</Label><Input type="datetime-local" value={isCreating ? (newEvent.endTime ? new Date(newEvent.endTime.getTime() - newEvent.endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "") : selectedEvent ? new Date(selectedEvent.endTime.getTime() - selectedEvent.endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => { const d = new Date(e.target.value); isCreating ? setNewEvent(prev => ({ ...prev, endTime: d })) : setSelectedEvent(prev => prev ? { ...prev, endTime: d } : null); }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Select value={isCreating ? newEvent.category : selectedEvent?.category} onValueChange={(v) => isCreating ? setNewEvent(prev => ({ ...prev, category: v })) : setSelectedEvent(prev => prev ? { ...prev, category: v } : null)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Color</Label><Select value={isCreating ? newEvent.color : selectedEvent?.color} onValueChange={(v) => isCreating ? setNewEvent(prev => ({ ...prev, color: v })) : setSelectedEvent(prev => prev ? { ...prev, color: v } : null)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{colors.map(c => <SelectItem key={c.value} value={c.value}><div className="flex items-center gap-2"><div className={cn("h-4 w-4 rounded", c.bg)} />{c.name}</div></SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Tags</Label><div className="flex flex-wrap gap-2">{availableTags.map(tag => { const sel = isCreating ? newEvent.tags?.includes(tag) : selectedEvent?.tags?.includes(tag); return <Badge key={tag} variant={sel ? "default" : "outline"} className="cursor-pointer hover:scale-105 transition-all" onClick={() => toggleTag(tag, isCreating)}>{tag}</Badge>; })}</div></div>
          </div>
          <DialogFooter>
            {!isCreating && <Button variant="destructive" onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)}>Delete</Button>}
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setIsCreating(false); setSelectedEvent(null); }}>Cancel</Button>
            <Button onClick={isCreating ? handleCreateEvent : handleUpdateEvent}>{isCreating ? "Create" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
