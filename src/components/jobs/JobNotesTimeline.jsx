import {  useState  } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import api from "@/api/client";
import { StickyNote, Send, MessageSquare } from "lucide-react";

export default function JobNotesTimeline({ job }) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => api.auth.me(),
  });

  // Missing notes_timeline field is treated as an empty array.
  const notes = Array.isArray(job?.notes_timeline) ? job.notes_timeline : [];
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime()
  );

  const addNoteMutation = useMutation({
    mutationFn: (patch) => api.entities.Job.update(job.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", job?.id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setNoteText("");
    },
  });

  const handleAddNote = (e) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text || !job) return;
    const entry = {
      timestamp: new Date().toISOString(),
      author: currentUser?.full_name || "Staff",
      text,
    };
    addNoteMutation.mutate({ notes_timeline: [...notes, entry] });
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl text-slate-100 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-orange-500" />
            Job Notes
          </CardTitle>
          {sortedNotes.length > 0 && (
            <span className="text-xs text-slate-500">{sortedNotes.length} note{sortedNotes.length === 1 ? "" : "s"}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <form onSubmit={handleAddNote} className="flex gap-2">
          <Input
            placeholder="Add a note for this job..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!noteText.trim() || addNoteMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 shrink-0"
            title="Add note"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {sortedNotes.length === 0 ? (
          <p className="text-center text-slate-500 py-6 flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            No notes yet
          </p>
        ) : (
          <div className="space-y-3">
            {sortedNotes.map((note, index) => {
              const ts = note?.timestamp ? new Date(note.timestamp) : null;
              const validTs = ts && !isNaN(ts.getTime());
              const initials = (note.author || "?")
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-slate-200 truncate">{note.author || "Unknown"}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {validTs ? formatDistanceToNow(ts, { addSuffix: true }) : ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1 break-words">{note.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
