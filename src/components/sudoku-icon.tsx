import { cn } from '@/lib/utils';

interface SudokuIconProps {
  className?: string;
}

export function SudokuIcon({ className }: SudokuIconProps) {
  return (
    <div className={cn(
      "w-8 h-8 grid grid-cols-3 grid-rows-3 gap-[1px]",
      className
    )}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="bg-gradient-to-br from-primary to-primary/80 rounded-[1px] shadow-sm"
        />
      ))}
    </div>
  );
}
