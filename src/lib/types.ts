export type Product = {
  id: string;
  clave?: string;
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
  stockTotal?: number;
  tallaIds?: string[];
  inventarioPorTalla?: ProductSizeStock[];
  hasSizeInventory?: boolean;
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
  tallaId?: string;
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

export type ProductSizeStock = {
  tallaId: string;
  cantidad: number;
};

export type ProductStockSnapshot = {
  productoId: string;
  tallaIds: string[];
  existencias: number;
  inventarioPorTalla: ProductSizeStock[];
};

export type ProductStockUpdatePayload = {
  cantidadNueva: number;
  tallaId?: string;
  tipo?: "ajuste" | "entrada" | "salida" | "venta" | "devolucion";
  motivo?: string;
  referencia?: string;
};

export type ProductStockUpdateResult = {
  productoId: string;
  tallaId?: string;
  cantidadAnterior: number;
  cantidadNueva: number;
  diferencia: number;
  existencias: number;
  inventarioPorTalla: ProductSizeStock[];
  movimientoId?: string;
  createdAt?: string;
};

export type ProductSizeInventoryReplacePayload = {
  inventarioPorTalla: ProductSizeStock[];
  motivo?: string;
  referencia?: string;
};

export type ProductSizeInventoryReplaceResult = {
  productoId: string;
  tallaIds: string[];
  inventarioPorTalla: ProductSizeStock[];
  existencias: number;
  cambios: Array<{
    tallaId: string;
    cantidadAnterior: number;
    cantidadNueva: number;
    diferencia: number;
    movimientoId?: string;
  }>;
};

export type TallaInventoryProduct = {
  productoId: string;
  clave?: string;
  descripcion?: string;
  cantidad: number;
  existencias: number;
};

export type TallaInventorySummary = {
  totalProductos: number;
  totalUnidades: number;
};

export type TallaInventorySnapshot = {
  talla: Talla;
  resumen: TallaInventorySummary;
  productos: TallaInventoryProduct[];
};

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
