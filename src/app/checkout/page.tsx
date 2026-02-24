'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '@/hooks/use-cart';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, CreditCard, Home, CheckCircle } from 'lucide-react';

const steps = [
  { id: 'shipping', name: 'Envío', icon: Home },
  { id: 'payment', name: 'Pago', icon: CreditCard },
  { id: 'confirmation', name: 'Confirmación', icon: CheckCircle },
];

const shippingSchema = z.object({
  name: z.string().min(2, 'Nombre es requerido'),
  address: z.string().min(5, 'Dirección es requerida'),
  city: z.string().min(2, 'Ciudad es requerida'),
  zip: z.string().regex(/^\d{5}$/, 'Código postal inválido'),
  email: z.string().email('Email inválido'),
});

const paymentSchema = z.object({
  cardNumber: z.string().regex(/^(?:[0-9]{4} ){3}[0-9]{4}$/, 'Número de tarjeta inválido'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Fecha inválida (MM/YY)'),
  cvc: z.string().regex(/^[0-9]{3,4}$/, 'CVC inválido'),
});

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { subtotal, dispatch } = useCart();

  const shippingForm = useForm<z.infer<typeof shippingSchema>>({
    resolver: zodResolver(shippingSchema),
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
  });

  const handleNextStep = async () => {
    let isValid = false;
    if (currentStep === 0) {
      isValid = await shippingForm.trigger();
    } else if (currentStep === 1) {
      isValid = await paymentForm.trigger();
    }

    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
    
    if (currentStep === 1 && isValid) {
      // "Place order"
      dispatch({ type: 'CLEAR_CART' });
      router.push('/checkout/confirmation');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
        router.back();
    }
  };

  const total = subtotal + 99;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={handlePrevStep}>
            <ArrowLeft/>
        </Button>
        <h1 className="font-headline text-4xl font-bold">Checkout</h1>
      </div>
      
      <div className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.name} className="relative flex-1">
              <div className="flex items-center text-sm font-medium">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${stepIdx <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  <step.icon className="h-6 w-6" />
                </span>
                <span className={`ml-4 hidden sm:block ${stepIdx <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>{step.name}</span>
              </div>
              {stepIdx < steps.length - 1 && (
                <div className={`absolute left-5 top-1/2 -z-10 mt-5 w-[calc(100%-2.5rem)] transform-gpu -translate-y-1/2 sm:left-1/2 sm:right-0 sm:top-5 sm:mt-0 sm:w-auto sm:-translate-x-1/2`}>
                  <div className={`h-0.5 w-full ${stepIdx < currentStep ? 'bg-primary' : 'bg-border'}`} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="md:col-span-1">
          {currentStep === 0 && (
            <Card>
              <CardHeader><CardTitle>Información de Envío</CardTitle></CardHeader>
              <CardContent>
                <Form {...shippingForm}>
                  <form className="space-y-4">
                    <FormField control={shippingForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={shippingForm.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Dirección</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex gap-4">
                        <FormField control={shippingForm.control} name="city" render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={shippingForm.control} name="zip" render={({ field }) => (
                            <FormItem className="w-1/3"><FormLabel>C.P.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                     <FormField control={shippingForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
             <Card>
              <CardHeader><CardTitle>Información de Pago</CardTitle></CardHeader>
              <CardContent>
                 <Form {...paymentForm}>
                  <form className="space-y-4">
                    <FormField control={paymentForm.control} name="cardNumber" render={({ field }) => (
                      <FormItem><FormLabel>Número de Tarjeta</FormLabel><FormControl><Input placeholder="0000 0000 0000 0000" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="flex gap-4">
                        <FormField control={paymentForm.control} name="expiryDate" render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel>Expiración</FormLabel><FormControl><Input placeholder="MM/YY" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={paymentForm.control} name="cvc" render={({ field }) => (
                            <FormItem className="w-1/3"><FormLabel>CVC</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader><CardTitle>Resumen del Pedido</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Envío</span><span>$99.00</span></div>
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </CardContent>
          </Card>
          <Button onClick={handleNextStep} className="mt-6 w-full" size="lg">
            {currentStep === 0 ? 'Continuar a Pago' : 'Realizar Pedido'}
          </Button>
        </div>
      </div>
    </div>
  );
}
