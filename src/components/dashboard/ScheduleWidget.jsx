
import { useQuery } from "@tanstack/react-query";
import { Event, Customer } from "@/api/entities";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  CalendarCheck,
  KeyRound,
  ArrowDownToLine,
  BellRing,
  ArrowRight,
} from "lucide-react";

const TYPE_ICONS = {
  appointment: CalendarCheck,
  pickup: KeyRound,
  dropoff: ArrowDownToLine,
  reminder: BellRing,
};

const TYPE_ICON_STYLES = {
  appointment: "bg-orange-500/15 text-orange-400",
  pickup: "bg-green-500/15 text-green-400",
  dropoff: "bg-blue-500/15 text-blue-400",
  reminder: "bg-purple-500/15 text-purple-400",
};

const TYPE_LABELS = {
  appointment: "Appointment",
  pickup: "Pickup",
  dropoff: "Dropoff",
  reminder: "Reminder",
};

export default function ScheduleWidget({ onOpenCalendar, limit = 8 }) {
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => Event.list(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => Customer.list(),
  });

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const in24h = now.getTime() + 24 * 60 * 60 * 1000;

  const upcoming = events
    .map((event) => ({ ...event, _date: parseISO(event.date) }))
    .filter((event) => !isNaN(event._date.getTime()) && event._date >= todayStart)
    .sort((a, b) => a._date - b._date)
    .slice(0, limit);

  const customerName = (customerId) => {
    if (!customerId) return null;
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name || customer.full_name || customer.email : null;
  };

  const isSoon = (date) => date.getTime() > now.getTime() && date.getTime() <= in24h;

  return (
    <div className="bg-slate-900 border-slate-800 rounded-xl shadow-xl">
      <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800 bg-slate-900/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-orange-500" />
          <h3 className="text-base font-bold text-slate-100">Today &amp; Upcoming</h3>
        </div>
        {onOpenCalendar && (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="text-xs text-slate-400 hover:text-orange-400 transition-colors flex items-center gap-1"
          >
            Calendar <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="p-3">
        {upcoming.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No upcoming events</p>
            <p className="text-xs text-slate-600 mt-1">Schedule appointments from the Calendar page</p>
          </div>
        ) : (
          <div className="space-y-1">
            {upcoming.map((event) => {
              const Icon = TYPE_ICONS[event.event_type] || CalendarDays;
              const name = customerName(event.customer_id);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={onOpenCalendar}
                  className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-800/70 transition-colors duration-150 group"
                >
                  <div
                    className={`mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
                      TYPE_ICON_STYLES[event.event_type] || TYPE_ICON_STYLES.appointment
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                        {event.title}
                      </p>
                      {isSoon(event._date) && (
                        <span className="relative flex h-2 w-2 shrink-0" title="Within 24 hours">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {format(event._date, "EEE, MMM d")}
                      {" · "}
                      <span className="text-slate-400">{format(event._date, "h:mm a")}</span>
                      {name ? ` · ${name}` : ""}
                    </p>
                  </div>

                  <span className="shrink-0 mt-1 text-[10px] uppercase tracking-wide text-slate-500 group-hover:text-slate-400">
                    {TYPE_LABELS[event.event_type] || event.event_type}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
