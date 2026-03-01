export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  lineId?: string;
  lineName?: string;
  tags: ("new" | "sale")[];
  sizes?: string[];
  colors?: string[];
  stock: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type CartItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
};

export type Cart = {
  items: CartItem[];
};

export type Linea = {
  id: string;
  codigo: number;
  nombre: string;
  activo: boolean;
};

export type Talla = {
  id: string;
  codigo: string;
  descripcion: string;
  orden?: number;
};

export type ApiPagination = {
  limit: number;
  nextCursor: string | null;
  hasNextPage: boolean;
};

export type InventoryMovementType =
  | "entrada"
  | "salida"
  | "ajuste"
  | "venta"
  | "devolucion";

export type InventoryMovement = {
  id: string;
  tipo: InventoryMovementType;
  productoId: string;
  tallaId?: string;
  cantidad: number;
  motivo?: string;
  referencia?: string;
  ordenId?: string;
  usuarioId?: string;
  createdAt?: string;
};

export type InventoryAlert = {
  productoId: string;
  productoNombre?: string;
  tallaId?: string;
  tallaCodigo?: string;
  stockActual: number;
  stockMinimo?: number;
  esCritica?: boolean;
  lineaId?: string;
  categoriaId?: string;
};

export type InventoryMovementPayload = {
  tipo: "entrada" | "salida" | "venta" | "devolucion";
  productoId: string;
  tallaId?: string;
  cantidad: number;
  motivo?: string;
  referencia?: string;
  ordenId?: string;
};

export type InventoryAdjustmentPayload = {
  productoId: string;
  tallaId?: string;
  cantidadFisica: number;
  motivo: string;
  referencia?: string;
};

export type UserRole = "ADMIN" | "EMPLEADO" | "CLIENTE";

export type Proveedor = {
  id: string;
  codigo?: string;
  nombre: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  activo: boolean;
};

export type OrderStatus =
  | "PENDIENTE"
  | "PAGADA"
  | "CONFIRMADA"
  | "ENVIADA"
  | "ENTREGADA"
  | "CANCELADA";

export type PaymentStatus =
  | "PENDIENTE"
  | "REQUIERE_ACCION"
  | "COMPLETADO"
  | "FALLIDO"
  | "REEMBOLSADO";

export type Orden = {
  id: string;
  usuarioId?: string;
  estado: OrderStatus | string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  metodoPago?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Pago = {
  id: string;
  ordenId: string;
  paymentIntentId?: string;
  clientSecret?: string;
  status: PaymentStatus | string;
  monto?: number;
  moneda?: string;
  createdAt?: string;
};

export type CheckoutPayload = {
  direccionEnvio: {
    nombre: string;
    direccion: string;
    ciudad: string;
    codigoPostal: string;
    email: string;
  };
  metodoPago: "TARJETA";
  costoEnvio: number;
  notas?: string;
};

export type CheckoutResponse = {
  ordenId: string;
  estado?: string;
  total?: number;
};

export type PaymentInitPayload = {
  ordenId: string;
  metodoPago: "TARJETA";
};

export type PaymentInitResponse = {
  pagoId: string;
  paymentIntentId: string;
  clientSecret: string;
  status: string;
};
