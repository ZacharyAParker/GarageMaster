import {  useMemo, useState  } from "react";
import api from "@/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Event, Customer, Vehicle, Job } from "@/api/entities";
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import AppointmentForm from "@/components/calendar/AppointmentForm";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  CalendarCheck,
  KeyRound,
  ArrowDownToLine,
  BellRing,
} from "lucide-react";

// color field -> tailwind bg classes for calendar chips
const COLOR_CHIP = {
  orange: "bg-orange-500/90 hover:bg-orange-500 text-white",
  blue: "bg-blue-500/90 hover:bg-blue-500 text-white",
  green: "bg-green-500/90 hover:bg-green-500 text-white",
  purple: "bg-purple-500/90 hover:bg-purple-500 text-white",
  red: "bg-red-500/90 hover:bg-red-500 text-white",
};

const COLOR_DOT = {
  orange: "bg-orange-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
};

const TYPE_ICONS = {
  appointment: CalendarCheck,
  pickup: KeyRound,
  dropoff: ArrowDownToLine,
  reminder: BellRing,
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_VIEW_START_HOUR = 7; // 7am
const DAY_VIEW_END_HOUR = 19; // 7pm

export default function Calendar() {
  const queryClient = useQueryClient();
  const [view, setView] = useState("month"); // 'month' | 'day'
  const [cursorDate, setCursorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formEvent, setFormEvent] = useState(null); // event object when editing
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultDate, setFormDefaultDate] = useState(new Date());

  const { data: events = [] } = useQuery({ queryKey: ["events"], queryFn: () => Event.list() });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => Customer.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: () => Vehicle.list() });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => Job.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => api.auth.listUsers() });

  const deleteMutation = useMutation({
    mutationFn: (id) => Event.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setFormOpen(false);
    },
  });

  // Parse every event date once
  const parsedEvents = useMemo(
    () =>
      events
        .map((event) => ({ ...event, _date: parseISO(event.date) }))
        .filter((event) => !isNaN(event._date.getTime()))
        .sort((a, b) => a._date - b._date),
    [events]
  );

  // Month grid: weeks as rows, 7 columns
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(cursorDate);
    const monthEnd = endOfMonth(cursorDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const days = [];
    let day = gridStart;
    while (day <= gridEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [cursorDate]);

  const eventsByDay = useMemo(() => {
    const map = {};
    parsedEvents.forEach((event) => {
      const key = format(event._date, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [parsedEvents]);

  const customerName = (id) => {
    const c = customers.find((x) => x.id === id);
    return c ? c.name || c.full_name || c.email : null;
  };
  const vehicleLabel = (id) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.year} ${v.make} ${v.model}` : null;
  };
  const jobLabel = (id) => {
    const j = jobs.find((x) => x.id === id);
    return j ? j.job_number || `Job ${j.id.slice(0, 8)}` : null;
  };
  const userName = (id) => {
    const u = users.find((x) => x.id === id);
    return u ? u.full_name || u.email : null;
  };

  const goPrev = () => {
    if (view === "month") setCursorDate((d) => addDays(startOfMonth(d), -1));
    else setSelectedDate((d) => addDays(d, -1));
  };
  const goNext = () => {
    if (view === "month") setCursorDate((d) => addDays(endOfMonth(d), 1));
    else setSelectedDate((d) => addDays(d, 1));
  };
  const goToday = () => {
    setCursorDate(new Date());
    setSelectedDate(new Date());
  };

  const openNewEvent = (date = selectedDate) => {
    setFormEvent(null);
    setFormDefaultDate(date);
    setFormOpen(true);
  };
  const openEditEvent = (event) => {
    setFormEvent(event);
    setFormOpen(true);
  };

  const headerLabel =
    view === "month" ? format(cursorDate, "MMMM yyyy") : format(selectedDate, "EEEE, MMMM d, yyyy");

  const selectedDayEvents = eventsByDay[format(selectedDate, "yyyy-MM-dd")] || [];

  const dayViewHours = useMemo(() => {
    const hours = [];
    for (let h = DAY_VIEW_START_HOUR; h <= DAY_VIEW_END_HOUR; h++) {
      const hourDate = new Date(selectedDate);
      hourDate.setHours(h, 0, 0, 0);
      hours.push(hourDate);
    }
    return hours;
  }, [selectedDate]);

  const renderEventMeta = (event) => {
    const bits = [customerName(event.customer_id), vehicleLabel(event.vehicle_id)].filter(Boolean);
    return bits.join(" · ");
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Calendar</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("month")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${
                view === "month" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Month
            </button>
            <button
              type="button"
              onClick={() => setView("day")}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors border-l border-slate-700 ${
                view === "day" ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <CalendarCheck className="w-4 h-4" /> Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={goPrev} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToday} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 px-4">
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goNext} className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={() => openNewEvent()}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
          >
            <Plus className="w-4 h-4 mr-1" /> New Appointment
          </Button>
        </div>
      </div>

      {formOpen && (
        <AppointmentForm
          event={formEvent}
          defaultDate={formDefaultDate}
          onClose={() => setFormOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main calendar area */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">{headerLabel}</h2>
            <span className="text-xs text-slate-500">
              {view === "month"
                ? `${parsedEvents.length} event${parsedEvents.length === 1 ? "" : "s"} this month`
                : `${selectedDayEvents.length} event${selectedDayEvents.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {view === "month" ? (
            <div>
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/60">
                {WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {weekday}
                  </div>
                ))}
              </div>

              {/* Week rows */}
              <div className="grid grid-cols-7">
                {monthDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay[key] || [];
                  const inMonth = isSameMonth(day, cursorDate);
                  const isToday = isSameDay(day, new Date());
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <div
                      key={key}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[92px] lg:min-h-[104px] p-1.5 border-b border-r border-slate-800 cursor-pointer transition-colors ${
                        isSelected ? "bg-slate-800/70" : "hover:bg-slate-800/40"
                      } ${inMonth ? "" : "opacity-40"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                            isToday
                              ? "bg-orange-600 text-white font-bold"
                              : inMonth
                                ? "text-slate-300"
                                : "text-slate-600"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        <button
                          type="button"
                          aria-label={`Add event on ${format(day, "MMM d")}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openNewEvent(day);
                          }}
                          className="opacity-0 hover:opacity-100 focus:opacity-100 text-slate-500 hover:text-orange-400 transition-opacity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            title={`${format(event._date, "h:mm a")} · ${event.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(day);
                              openEditEvent(event);
                            }}
                            className={`block w-full text-left truncate rounded px-1.5 py-0.5 text-[10px] leading-tight font-medium ${COLOR_CHIP[event.color] || COLOR_CHIP.orange}`}
                          >
                            {format(event._date, "h:mm a")} {event.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(day);
                            }}
                            className="text-[10px] text-slate-400 hover:text-orange-400 pl-1"
                          >
                            +{dayEvents.length - 3} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Day view: hours 7am-7pm */
            <div className="divide-y divide-slate-800">
              {dayViewHours.map((hourDate) => {
                const hourEvents = selectedDayEvents.filter(
                  (event) =>
                    event._date.getHours() === hourDate.getHours()
                );
                return (
                  <div key={hourDate.toISOString()} className="flex">
                    <button
                      type="button"
                      onClick={() => openNewEvent(hourDate)}
                      className="w-20 shrink-0 py-3 pr-2 text-right text-xs text-slate-500 hover:text-orange-400 border-r border-slate-800"
                    >
                      {format(hourDate, "h a")}
                    </button>
                    <div className="flex-1 p-2 space-y-1 min-h-[48px]">
                      {hourEvents.map((event) => {
                        const Icon = TYPE_ICONS[event.event_type] || CalendarDays;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => openEditEvent(event)}
                            className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ${COLOR_CHIP[event.color] || COLOR_CHIP.orange}`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{event.title}</span>
                            <span className="ml-auto shrink-0 opacity-80">{format(event._date, "h:mm a")}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel: selected day */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl self-start">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100">
              {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, "EEE, MMM d")}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => openNewEvent(selectedDate)}
              className="text-orange-400 hover:text-orange-300 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          <div className="p-3 space-y-2">
            {selectedDayEvents.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No events scheduled</p>
            ) : (
              selectedDayEvents.map((event) => {
                const Icon = TYPE_ICONS[event.event_type] || CalendarDays;
                const meta = renderEventMeta(event);
                return (
                  <div
                    key={event.id}
                    className="p-3 bg-slate-800/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT[event.color] || COLOR_DOT.orange}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{event.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Icon className="w-3 h-3" />
                            {format(event._date, "h:mm a")}
                            {" · "}
                            {event.duration_minutes || 60} min
                          </p>
                          {meta && <p className="text-xs text-slate-500 mt-0.5 truncate">{meta}</p>}
                          {(jobLabel(event.job_id) || userName(event.assigned_to)) && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              {jobLabel(event.job_id) ? `Job: ${jobLabel(event.job_id)}` : ""}
                              {jobLabel(event.job_id) && userName(event.assigned_to) ? " · " : ""}
                              {userName(event.assigned_to) ? `Assigned: ${userName(event.assigned_to)}` : ""}
                            </p>
                          )}
                          {event.notes && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">{event.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditEvent(event)}
                          className="h-7 w-7 text-slate-400 hover:text-orange-300 hover:bg-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete "${event.title}"?`)) {
                              deleteMutation.mutate(event.id);
                            }
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
