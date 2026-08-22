
import api from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Bell, Check, Wrench, MessageSquare, Package, FileCheck, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function NotificationBell() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => api.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.id],
  queryFn: () => api.entities.Notification.filter({ user_id: currentUser?.id }, '-created_date', 50),
    enabled: !!currentUser?.id
  });

  const markAsReadMutation = useMutation({
  mutationFn: (id) => api.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifications.map(n => 
  api.entities.Notification.update(n.id, { read: true })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type) => {
    switch(type) {
      case 'job_assigned': return <Wrench className="w-4 h-4 text-orange-400" />;
      case 'job_updated': return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'message_received': return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'low_stock': return <Package className="w-4 h-4 text-red-400" />;
      case 'quote_approved': return <FileCheck className="w-4 h-4 text-green-400" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-slate-800">
          <Bell className="w-5 h-5 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 bg-slate-900 border-slate-800 p-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${
                  !notification.read ? 'bg-slate-800/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-200 text-sm">{notification.title}</p>
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {format(new Date(notification.created_date), "MMM d, h:mm a")}
                    </p>
                    {notification.link && (
                      <Link 
                        to={notification.link}
                        className="text-xs text-orange-400 hover:text-orange-300 mt-2 inline-block"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}