'use client';

import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

type QuantitySelectorProps = {
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
  maxQuantity: number;
};

export function QuantitySelector({
  quantity,
  onQuantityChange,
  maxQuantity,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    onQuantityChange(Math.max(1, quantity - 1));
  };

  const handleIncrement = () => {
    onQuantityChange(Math.min(maxQuantity, quantity + 1));
  };

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-muted/45 p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={handleDecrement}
        disabled={quantity <= 1}
      >
        <Minus className="h-4 w-4" />
        <span className="sr-only">Reducir cantidad</span>
      </Button>
      <span className="w-10 text-center text-sm font-semibold text-foreground">
        {quantity}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full"
        onClick={handleIncrement}
        disabled={quantity >= maxQuantity}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Aumentar cantidad</span>
      </Button>
    </div>
  );
}
