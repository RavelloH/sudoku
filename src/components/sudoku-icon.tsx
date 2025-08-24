import { cn } from '@/lib/utils';

interface SudokuIconProps {
  className?: string;
}

export function SudokuIcon({ className }: SudokuIconProps) {
  return (
    <div className={cn(
      "w-8 h-8 bg-gradient-to-br from-primary/20 via-primary/40 to-primary/60 rounded-lg p-1 shadow-sm",
      className
    )}>
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[1px]">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-br from-primary to-primary/80 rounded-[1px]"
          />
        ))}
      </div>
    </div>
  );
}
