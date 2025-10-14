import React, { useState } from "react";
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Send, Inbox, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Messages() {
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
  queryFn: () => api.entities.Message.list("-created_date")
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
  queryFn: () => api.entities.User.list()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
  queryFn: () => api.entities.Job.list()
  });

  const markAsReadMutation = useMutation({
  mutationFn: (id) => api.entities.Message.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const sendMessageMutation = useMutation({
  mutationFn: (data) => api.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowCompose(false);
    }
  });

  const [composeData, setComposeData] = useState({
    to_user_id: "",
    subject: "",
    body: "",
    related_job_id: "",
    priority: "normal"
  });

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (!message.read && message.to_user_id === currentUser?.id) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessageMutation.mutate({
      ...composeData,
      from_user_id: currentUser?.id
    });
  };

  const myMessages = messages.filter(m => 
    m.to_user_id === currentUser?.id || m.from_user_id === currentUser?.id
  );

  const unreadCount = messages.filter(m => 
    m.to_user_id === currentUser?.id && !m.read
  ).length;

  const getUserName = (userId) => {
    return users.find(u => u.id === userId)?.full_name || 'Unknown';
  };

  const priorityColors = {
    low: "bg-blue-900/50 text-blue-300 border-0",
    normal: "bg-slate-700 text-slate-300 border-0",
    high: "bg-red-900/50 text-red-300 border-0"
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Team Messages</h1>
          <p className="text-slate-400 mt-1">Internal communication center</p>
        </div>
        <Button
          onClick={() => setShowCompose(!showCompose)}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {showCompose && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-xl text-slate-100">Compose Message</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">To *</label>
                  <select
                    required
                    value={composeData.to_user_id}
                    onChange={(e) => setComposeData({ ...composeData, to_user_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-2"
                  >
                    <option value="">Select recipient</option>
                    {users.filter(u => u.id !== currentUser?.id).map((user) => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">Priority</label>
                  <select
                    value={composeData.priority}
                    onChange={(e) => setComposeData({ ...composeData, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Related Job (Optional)</label>
                <select
                  value={composeData.related_job_id}
                  onChange={(e) => setComposeData({ ...composeData, related_job_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-2"
                >
                  <option value="">None</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_number || `Job #${job.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Subject *</label>
                <Input
                  required
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">Message *</label>
                <Textarea
                  required
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-slate-200"
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCompose(false)} className="bg-slate-800 border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" disabled={sendMessageMutation.isPending} className="bg-gradient-to-r from-orange-600 to-orange-500">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-100">Inbox</CardTitle>
              {unreadCount > 0 && (
                <Badge className="bg-orange-600 text-white border-0">{unreadCount}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {myMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">No messages</p>
                </div>
              ) : (
                myMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleSelectMessage(message)}
                    className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                      !message.read && message.to_user_id === currentUser?.id ? 'bg-slate-800/30' : ''
                    } ${selectedMessage?.id === message.id ? 'bg-slate-800' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-slate-200 text-sm">
                        {message.from_user_id === currentUser?.id ? `To: ${getUserName(message.to_user_id)}` : getUserName(message.from_user_id)}
                      </p>
                      {message.priority === 'high' && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <p className="text-slate-300 font-medium text-sm mb-1">{message.subject}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(message.created_date), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedMessage ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-slate-100">{selectedMessage.subject}</CardTitle>
                    <p className="text-sm text-slate-400 mt-2">
                      From: {getUserName(selectedMessage.from_user_id)} • 
                      {format(new Date(selectedMessage.created_date), " MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Badge className={priorityColors[selectedMessage.priority]}>
                    {selectedMessage.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 whitespace-pre-wrap">{selectedMessage.body}</p>
                </div>
                {selectedMessage.related_job_id && (
                  <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-500 mb-1">Related Job</p>
                    <p className="text-slate-300">
                      {jobs.find(j => j.id === selectedMessage.related_job_id)?.job_number || 'Unknown Job'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-12 text-center">
                <Inbox className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Select a message to read</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}