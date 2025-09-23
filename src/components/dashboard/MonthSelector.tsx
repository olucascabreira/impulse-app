import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const monthNames = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function MonthSelector({ selectedDate, onDateChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());

  // Update local state when selectedDate changes
  useEffect(() => {
    setCurrentYear(selectedDate.getFullYear());
    setCurrentMonth(selectedDate.getMonth());
  }, [selectedDate]);

  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(currentYear, monthIndex, 1);
    onDateChange(newDate);
    setIsOpen(false);
  };

  const handlePrevYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(prev => prev + 1);
  };

  const formatDate = (date: Date) => {
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handlePrevMonth}
        aria-label="Mês anterior"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="font-medium">
            <Calendar className="mr-2 h-4 w-4" />
            {formatDate(selectedDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrevYear}
                aria-label="Ano anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </Button>
              <div className="font-medium">{currentYear}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextYear}
                aria-label="Próximo ano"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 p-3">
            {monthNames.map((month, index) => (
              <Button
                key={month}
                variant={index === currentMonth && currentYear === selectedDate.getFullYear() ? "default" : "ghost"}
                className={cn(
                  "h-12 text-sm font-normal",
                  index === currentMonth && currentYear === selectedDate.getFullYear() && "bg-primary text-primary-foreground"
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {month}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleNextMonth}
        aria-label="Próximo mês"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </Button>
    </div>
  );
}