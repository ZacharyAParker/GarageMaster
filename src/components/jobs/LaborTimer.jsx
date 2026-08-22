import {  useEffect, useState  } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { Play, Pause, Square, Timer, Clock, DollarSign, History } from "lucide-react";

// Statuses in which the labor timer is offered to mechanics.
const TIMER_STATUSES = ["in_progress", "waiting_for_parts", "quality_check"];

// 15 minutes of billable time per quarter-hour block.
const QUARTER_HOUR_SECONDS = 900;

export function formatElapsed(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function LaborTimer({ job }) {
  const queryClient = useQueryClient();
  // Ticking state: only used while a timer is running; forces a re-render each second.
  const [now, setNow] = useState(() => Date.now());

  const isRunning = Boolean(job?.timer_started_at);

  // Running clock: update every second via setInterval.
  useEffect(() => {
    if (!isRunning) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["job", job?.id] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const mutation = useMutation({
    mutationFn: (patch) => api.entities.Job.update(job.id, patch),
    onSuccess: invalidate,
  });

  // All hooks above; early return after them keeps the hooks order stable.
  if (!job || !TIMER_STATUSES.includes(job.status)) return null;

  const accumulatedSeconds = Number(job.accumulated_seconds) || 0;
  const runSeconds = isRunning
    ? Math.max(0, Math.floor((now - new Date(job.timer_started_at).getTime()) / 1000))
    : 0;
  const elapsedSeconds = accumulatedSeconds + runSeconds;
  const timeEntries = Array.isArray(job.time_entries) ? job.time_entries : [];
  const laborRate = Number(job.labor_rate) || 85;
  const billedLaborCost = job.total_labor_cost ?? (Number(job.labor_hours) || 0) * laborRate;

  const handleStart = () => {
    mutation.mutate({ timer_started_at: new Date().toISOString() });
  };

  // Pause folds the running segment into accumulated_seconds and persists it
  // immediately, so nothing is lost on refresh.
  const handlePause = () => {
    if (!isRunning) return;
    mutation.mutate({
      timer_started_at: null,
      accumulated_seconds: accumulatedSeconds + runSeconds,
    });
  };

  // Stop bills the tracked time: append a time entry, add quarter-hour-rounded
  // hours to labor_hours and recalculate labor/total cost.
  const handleStop = () => {
    const endedAt = new Date();
    const sessionSeconds = elapsedSeconds;
    const entries = [...timeEntries];
    entries.push({
      started_at: isRunning
        ? job.timer_started_at
        : new Date(endedAt.getTime() - sessionSeconds * 1000).toISOString(),
      ended_at: endedAt.toISOString(),
      seconds: sessionSeconds,
    });

    const addedHours = Math.round(sessionSeconds / QUARTER_HOUR_SECONDS) / 4;
    const laborHours = (Number(job.labor_hours) || 0) + addedHours;
    const totalLaborCost = laborHours * laborRate;
    const totalPartsCost = Number(job.total_parts_cost) || 0;

    mutation.mutate({
      time_entries: entries,
      timer_started_at: null,
      accumulated_seconds: 0,
      labor_hours: laborHours,
      total_labor_cost: totalLaborCost,
      total_cost: totalLaborCost + totalPartsCost,
    });
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
            <Timer className="w-5 h-5 text-orange-500" />
            Labor Timer
          </CardTitle>
          <Badge
            className={
              isRunning
                ? "bg-green-900/50 text-green-300 border-0"
                : "bg-slate-700 text-slate-300 border-0"
            }
          >
            <span
              className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                isRunning ? "bg-green-400 animate-pulse" : "bg-slate-400"
              }`}
            />
            {isRunning ? "Running" : accumulatedSeconds > 0 ? "Paused" : "Idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div className="text-center">
          <p
            className={`font-mono font-bold tracking-widest text-5xl tabular-nums ${
              isRunning ? "text-green-400" : "text-slate-200"
            }`}
          >
            {formatElapsed(elapsedSeconds)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Unbilled tracked time &middot; billed in quarter-hour blocks at ${laborRate}/hr
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              disabled={mutation.isPending}
              className="bg-green-600 hover:bg-green-500 min-w-[120px]"
            >
              <Play className="w-4 h-4 mr-2" />
              {mutation.isPending ? "..." : "Start"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handlePause}
              disabled={mutation.isPending}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 min-w-[120px]"
            >
              <Pause className="w-4 h-4 mr-2" />
              {mutation.isPending ? "..." : "Pause"}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleStop}
            disabled={mutation.isPending || elapsedSeconds === 0}
            className="border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 bg-transparent min-w-[120px]"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop &amp; Log
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
              <Clock className="w-3 h-3" /> Billed Hours
            </div>
            <p className="text-slate-100 font-semibold">{(Number(job.labor_hours) || 0).toFixed(2)} h</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
              <DollarSign className="w-3 h-3" /> Labor Cost
            </div>
            <p className="text-slate-100 font-semibold">${Number(billedLaborCost || 0).toFixed(2)}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
              <History className="w-3 h-3" /> Time Entries
            </div>
            <p className="text-slate-100 font-semibold">{timeEntries.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
