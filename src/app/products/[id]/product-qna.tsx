"use client";

import { useState, useTransition } from 'react';
import type { Product } from '@/lib/types';
import { askQuestion } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, User } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Logo } from '@/components/icons';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function ProductQnA({ product }: { product: Product }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: question },
    ];
    setMessages(newMessages);
    setQuestion('');

    startTransition(async () => {
      const answer = await askQuestion(product, question);
      setMessages([...newMessages, { role: 'assistant', content: answer }]);
    });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <span className="font-headline font-semibold">
              Pregúntale a la IA sobre este producto
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 rounded-lg border bg-card p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Ej. ¿La tela es transpirable? ¿Qué tipo de corte tiene?
              </p>
            )}

            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'justify-end' : ''
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary p-1">
                      <Logo className="h-6 w-auto" />
                    </div>
                  )}
                  <div
                    className={`max-w-xs rounded-lg px-4 py-2 text-sm lg:max-w-md ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
              {isPending && (
                 <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary p-1">
                      <Logo className="h-6 w-auto" />
                    </div>
                     <div className="flex items-center space-x-2 rounded-lg bg-secondary px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Pensando...</span>
                    </div>
                 </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4">
              <Input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={isPending}
              />
              <Button type="submit" disabled={isPending || !question.trim()}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Enviar'
                )}
              </Button>
            </form>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
