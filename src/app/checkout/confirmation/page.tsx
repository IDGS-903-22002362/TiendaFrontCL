import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ConfirmationPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="pt-4 text-center font-headline text-3xl font-bold">
            ¡Gracias por tu compra!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Hemos recibido tu pedido y lo estamos procesando. Recibirás un
            correo de confirmación con los detalles de tu compra y el
            seguimiento del envío.
          </p>
          <div className="mt-6">
            <p className="font-semibold">Número de pedido:</p>
            <p className="font-mono text-lg text-primary">#LEON-17052024-001</p>
          </div>
          <Button asChild className="mt-8 w-full" size="lg">
            <Link href="/products">Seguir comprando</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
