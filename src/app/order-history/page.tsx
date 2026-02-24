import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const orders = [
  {
    id: '#DUNGEON-17052024-001',
    date: '17 de Mayo, 2024',
    status: 'Entregado',
    total: 1798.0,
  },
  {
    id: '#DUNGEON-02042024-003',
    date: '2 de Abril, 2024',
    status: 'Entregado',
    total: 499.0,
  },
  {
    id: '#DUNGEON-15012024-002',
    date: '15 de Enero, 2024',
    status: 'Entregado',
    total: 2100.0,
  },
];

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
  'Entregado': 'default',
  'Enviado': 'secondary',
  'Cancelado': 'destructive'
}

export default function OrderHistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 font-headline text-4xl font-bold">Mis Pedidos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pedidos</CardTitle>
          <CardDescription>
            Aquí puedes ver el historial de tus compras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[order.status] || 'default'}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
