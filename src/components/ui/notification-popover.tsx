import React from 'react';
import { 
  Bell,
  AlertCircle,
  DollarSign,
  Clock,
  CheckCircle
} from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'due_soon' | 'overdue' | 'due_today';
  amount: number;
  isRead: boolean;
  transactionId: string;
}

interface NotificationPopoverProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
}

export function NotificationPopover({
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onNotificationClick
}: NotificationPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 w-8 p-0"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notificações</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
              className="h-6 text-xs"
            >
              Marcar todas como lidas
            </Button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 hover:bg-accent cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-accent/30' : ''
                  }`}
                  onClick={() => onNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${
                      notification.type === 'overdue' ? 'text-red-500' :
                      notification.type === 'due_soon' || notification.type === 'due_today' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`}>
                      {notification.type === 'overdue' ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : notification.type === 'due_soon' || notification.type === 'due_today' ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <DollarSign className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.description}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {format(notification.date, "dd/MM/yyyy")}
                        </span>
                        <span className="text-xs font-medium">
                          {notification.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}