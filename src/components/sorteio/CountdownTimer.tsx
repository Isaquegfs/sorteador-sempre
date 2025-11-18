import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  duration: number; // em segundos
  onConfirm: () => void;
  onReject: () => void;
  winnerName: string;
  startTimestamp?: number | null; // timestamp em ms de quando começou
}

export const CountdownTimer = ({ 
  duration, 
  onConfirm, 
  onReject, 
  winnerName,
  startTimestamp 
}: CountdownTimerProps) => {
  // Calcular tempo inicial baseado no timestamp
  const calculateInitialTime = () => {
    if (startTimestamp) {
      const elapsed = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = duration - elapsed;
      return remaining > 0 ? remaining : 0;
    }
    return duration;
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialTime());
  const [isExpired, setIsExpired] = useState(calculateInitialTime() <= 0);

  useEffect(() => {
    const newTime = calculateInitialTime();
    setTimeLeft(newTime);
    setIsExpired(newTime <= 0);
  }, [duration, winnerName, startTimestamp]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClass = () => {
    if (timeLeft <= 10) return 'text-destructive';
    if (timeLeft <= 20) return 'text-yellow-500';
    return 'text-primary';
  };

  return (
    <div className="absolute top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 animate-fade-in">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Clock className={cn("h-5 w-5 animate-pulse", getColorClass())} />
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              {isExpired ? 'Tempo esgotado' : 'Tempo restante'}
            </div>
            <div className={cn("text-2xl font-bold tabular-nums", getColorClass())}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={onConfirm}
            className="gap-2 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <CheckCircle className="h-4 w-4" />
            Confirmado
          </Button>
          
          {isExpired && (
            <Button
              onClick={onReject}
              variant="destructive"
              className="gap-2 animate-fade-in"
              size="sm"
            >
              <XCircle className="h-4 w-4" />
              Não confirmado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
