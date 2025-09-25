import { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/use-transactions';
import { parseISO, isBefore, isAfter, addDays, isToday, isWithinInterval } from 'date-fns';

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

export function usePaymentReminders() {
  const { transactions, loading } = useTransactions();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading) {
      generateNotifications();
    }
  }, [transactions, loading]);

  const generateNotifications = () => {
    const now = new Date();
    const newNotifications: Notification[] = [];

    transactions.forEach(transaction => {
      if (!transaction.due_date) return; // Skip transactions without due dates

      const dueDate = parseISO(transaction.due_date);
      const contactName = transaction.contacts?.name || 'Contato desconhecido';
      const amount = Number(transaction.amount);

      // Check for overdue payments (both receivables and payables)
      if (isBefore(dueDate, now) && transaction.status !== 'pago' && transaction.status !== 'recebido' && transaction.status !== 'cancelado') {
        const type = transaction.transaction_type === 'saida' ? 'overdue' : 'overdue'; // Both payables and receivables
        const title = transaction.transaction_type === 'saida' 
          ? 'Conta a pagar vencida' 
          : 'Conta a receber vencida';
        
        newNotifications.push({
          id: `overdue-${transaction.id}`,
          title,
          description: `${contactName} - ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          date: dueDate,
          type: 'overdue',
          amount,
          isRead: false,
          transactionId: transaction.id
        });
      }
      // Check for payments due today
      else if (isToday(dueDate) && transaction.status !== 'pago' && transaction.status !== 'recebido' && transaction.status !== 'cancelado') {
        const type = transaction.transaction_type === 'saida' ? 'due_today' : 'due_today';
        const title = transaction.transaction_type === 'saida' 
          ? 'Conta a pagar vence hoje' 
          : 'Conta a receber vence hoje';
        
        newNotifications.push({
          id: `today-${transaction.id}`,
          title,
          description: `${contactName} - ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          date: dueDate,
          type: 'due_today',
          amount,
          isRead: false,
          transactionId: transaction.id
        });
      }
      // Check for payments due within the next 3 days
      else if (
        isWithinInterval(dueDate, { start: now, end: addDays(now, 3) }) && 
        transaction.status !== 'pago' && 
        transaction.status !== 'recebido' && 
        transaction.status !== 'cancelado'
      ) {
        const title = transaction.transaction_type === 'saida' 
          ? 'Conta a pagar próxima do vencimento' 
          : 'Conta a receber próxima do vencimento';
        
        newNotifications.push({
          id: `soon-${transaction.id}`,
          title,
          description: `${contactName} - ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          date: dueDate,
          type: 'due_soon',
          amount,
          isRead: false,
          transactionId: transaction.id
        });
      }
    });

    setNotifications(newNotifications);
    setUnreadCount(newNotifications.length);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
    setUnreadCount(prev => prev - 1);
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    setUnreadCount(0);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  return {
    notifications,
    unreadCount: getUnreadCount(),
    markAsRead,
    markAllAsRead,
    loading
  };
}