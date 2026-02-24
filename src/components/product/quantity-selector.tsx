'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="flex items-center">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-r-none"
        onClick={handleDecrement}
        disabled={quantity <= 1}
      >
        <Minus className="h-4 w-4" />
        <span className="sr-only">Reducir cantidad</span>
      </Button>
      <Input
        type="number"
        className="h-8 w-12 rounded-none border-x-0 text-center"
        value={quantity}
        readOnly
      />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-l-none"
        onClick={handleIncrement}
        disabled={quantity >= maxQuantity}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">Aumentar cantidad</span>
      </Button>
    </div>
  );
}
