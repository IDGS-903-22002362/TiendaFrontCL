export type Product = {
  id: string;
  clave?: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  categoryId?: string;
  lineId?: string;
  lineName?: string;
  tags: ("new" | "sale")[];
  sizes?: string[];
  colors?: string[];
  stock: number;
  stockTotal?: number;
  stockFisico?: number;
  tallaIds?: string[];
  inventarioPorTalla?: ProductSizeStock[];
  hasSizeInventory?: boolean;
  detailIds?: string[];
  activo?: boolean;
  ratingSummary?: ProductRatingSummary;
  isFavorito?: boolean;
  ratingEligibility?: ProductRatingEligibility;
  myRating?: ProductUserRating | null;
  fedexShipping?: ProductFedexShipping;
};

export type ProductFedexShipping = {
  enabled?: boolean;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  packageType?: "YOUR_PACKAGING";
  declaredValue?: number;
  countryOfManufacture?: "MX";
  customsDescription?: string;
  hsCode?: string;
};

export type ProductRatingSummary = {
  average: number;
  count: number;
  updatedAt?: string;
};

export type ProductRatingEligibilityReason =
  | "eligible"
  | "purchase_required"
  | "not_delivered";

export type ProductRatingEligibility = {
  canRate: boolean;
  reason: ProductRatingEligibilityReason;
};

export type ProductUserRating = {
  score: number;
  updatedAt: string;
};

export type ProductExtraDetail = {
  id: string;
  descripcion: string;
  productoId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FavoriteItem = {
  id: string;
  usuarioId: string;
  createdAt: string;
  producto: Product;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  imagenPrincipal?: string | null;
  lineaId?: string | null;
  orden?: number | null;
};

export type CartItemStockStatus =
  | "available"
  | "out_of_stock"
  | "temporarily_unavailable";

export type CartItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  tallaId?: string;
  size?: string;
  color?: string;
  disponible?: number;
  stockFisico?: number;
  stockStatus?: CartItemStockStatus;
  purchasable?: boolean;
};

export type Cart = {
  id?: string;
  items: CartItem[];
};

export type Linea = {
  id: string;
  codigo: number;
  nombre: string;
  activo: boolean;
  imagenPrincipal?: string | null;
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

export type RecepcionEstado = "borrador" | "parcial" | "cerrada" | "cancelada";

export type RecepcionLinea = {
  productoId: string;
  tallaId?: string | null;
  cantidadEsperada: number;
  cantidadAceptada: number;
  cantidadRechazada: number;
  cantidadPendiente: number;
};

export type RecepcionMercancia = {
  id?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  referencia: string;
  fechaRecepcion: string;
  responsableId: string;
  responsableNombre?: string;
  estado: RecepcionEstado;
  lineas: RecepcionLinea[];
  notas?: string;
  cerradaEn?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateRecepcionPayload = {
  proveedorId?: string;
  proveedorNombre?: string;
  referencia: string;
  fechaRecepcion: string;
  notas?: string;
  lineas?: Array<{
    productoId: string;
    tallaId?: string;
    cantidadEsperada: number;
  }>;
};

export type ConfirmRecepcionPayload = {
  lineas: Array<{
    productoId: string;
    tallaId?: string;
    cantidadAceptada: number;
    cantidadRechazada: number;
  }>;
  idempotencyKey?: string;
};

export type UserRole = "ADMIN" | "EMPLEADO" | "CLIENTE" | "EMPLEADO_CLUB" | "SUPER_ADMIN";

export type Provider = "google" | "apple" | "email";

export type Usuario = {
  id?: string;
  uid: string;
  email: string;
  nombre: string;
  rol: UserRole;
  provider?: Provider;
  telefono?: string;
  stripeCustomerId?: string;
  puntosActuales: number;
  nivel?: string;
  fechaNacimiento?: string;
  perfilCompleto?: boolean;
  edad?: number;
  genero?: string;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export interface Galeria {
  id: string;
  descripcion: string;
  imagenes: string[];
  videos: string[];
  usuarioId?: string;
  autorNombre?: string;
  estatus: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type TipoMovimientoPuntos =
  | "ACUMULACION"
  | "CANJE"
  | "AJUSTE"
  | "EXPIRACION"
  | "BONIFICACION"
  | "DEVOLUCION";

export type OrigenPuntos =
  | "tienda"
  | "comedor"
  | "promo"
  | "admin"
  | "referido"
  | "cumpleaños"
  | "evento";

export type MovimientoPuntos = {
  id?: string;
  usuarioId: string;
  tipo: TipoMovimientoPuntos;
  puntos: number;
  saldoAnterior: number;
  saldoNuevo: number;
  origen: OrigenPuntos;
  referencia?: string;
  descripcion?: string;
  createdAt?: string;
};

export type NivelLealtad = {
  id?: string;
  nombre: string;
  puntosMinimos: number;
  beneficios: string[];
  multiplicador?: number;
  color?: string;
  orden: number;
};

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

export type PaymentMethod = "TARJETA";
export type FulfillmentMethod = "DELIVERY" | "PICKUP";
export type CheckoutFulfillmentMethod =
  | FulfillmentMethod
  | "pickup"
  | "home_delivery";

export type FulfillmentStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "EXPIRED"
  | "CANCELED";

// Estado de pago a nivel de orden (espejo simplificado del backend)
export type OrderPaymentState =
  | "PENDIENTE"
  | "PAGADO"
  | "FALLIDO"
  | "REEMBOLSADO";

// Estado granular de preparacion/fulfillment (fuente de verdad para UI)
export type PreparationStatus =
  | "WAITING_PAYMENT"
  | "PENDING_PREPARATION"
  | "PREPARING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERED"
  | "INCIDENT"
  | "RETURNED";

// Estado del envio manual (FedEx manual) almacenado en shipping.status
export type ManualShippingStatus =
  | "pending_manual_shipment"
  | "PREPARING"
  | "READY_TO_SHIP"
  | "DELIVERED_TO_CARRIER"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "INCIDENT"
  | "RETURNED";

export type ShippingProvider = "FEDEX";
export type AddressValidationStatus =
  | "VALIDATED"
  | "SUGGESTED"
  | "USER_CONFIRMED"
  | "NOT_VALIDATED"
  | "VALIDATION_UNAVAILABLE";

export type FedExShippingStatus =
  | "QUOTE_SELECTED"
  | "LABEL_CREATED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "EXCEPTION"
  | "CANCELED"
  | "UNKNOWN"
  | string;

export type FedExAddress = {
  streetLines: string[];
  city?: string;
  stateOrProvinceCode?: string;
  postalCode: string;
  countryCode: string;
  residential?: boolean;
};

export type FedExResolvedAddress = FedExAddress & {
  isLikelyValid?: boolean;
  isResolved?: boolean;
  isStandardized?: boolean;
  isDeliveryPointValid?: boolean;
  attributes?: Record<string, unknown>;
};

export type FedExAddressValidation = {
  isValid: boolean;
  success?: boolean;
  classification?: string;
  addressState?: string;
  resolvedAddress?: FedExResolvedAddress;
  addresses?: FedExResolvedAddress[];
  changes?: Array<{ field?: string; original?: string; resolved?: string }>;
  warnings?: string[];
  customerMessages?: string[];
};

export type FedExShippingOption = {
  provider: ShippingProvider;
  optionId?: string;
  serviceType: string;
  serviceName?: string;
  packagingType?: string;
  amount: number;
  currency: string;
  estimatedDeliveryDate?: string;
  transitTime?: string;
  rateType?: string;
  surcharges?: Array<{
    type?: string;
    description?: string;
    amount: number;
    currency: string;
  }>;
};

export type FedExShippingQuote = {
  provider: ShippingProvider;
  quoteId: string;
  currency: string;
  requiresShipping: boolean;
  expiresAt?: string;
  options: FedExShippingOption[];
};

export type ShippingSelection = {
  method: ShippingProvider;
  provider: ShippingProvider;
  serviceType: string;
  serviceName?: string;
  carrierCode?: string;
  packagingType?: string;
  quotedAmount?: number;
  quotedCurrency?: string;
  transitTime?: string;
  deliveryTimestamp?: string;
};

export type FedExTrackingEvent = {
  timestamp?: string;
  status?: string;
  statusLabel?: string;
  description?: string;
  location?: string;
};

export type FedExTracking = {
  trackingNumber?: string;
  status?: FedExShippingStatus;
  statusLabel?: string;
  statusDescription?: string;
  estimatedDeliveryDate?: string;
  deliveredAt?: string;
  lastLocation?: string;
  events: FedExTrackingEvent[];
  warnings?: string[];
};

export type OrderShipping = {
  provider?: ShippingProvider | string;
  status?: ManualShippingStatus | FedExShippingStatus;
  quoteId?: string;
  selectedOptionId?: string;
  serviceType?: string;
  serviceName?: string;
  amount?: number;
  currency?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelStoragePath?: string;
  estimatedDeliveryDate?: string;
  shippedAt?: string;
  deliveredAt?: string;
  transitTime?: string;
  manualEvidence?: {
    realShippingCost?: number;
    receiptUrl?: string;
    guidePdfUrl?: string;
    notes?: string;
  };
  warnings?: string[];
};

export type OrdenItem = {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  tallaId?: string;
  producto?: {
    clave?: string;
    descripcion?: string;
    imagenes?: string[];
  };
};

export type OrderStatusHistoryEntry = {
  type?: string;
  from?: string;
  to?: string;
  changedBy?: string;
  changedAt?: string;
  note?: string;
};

export type OrderDireccionEnvio = {
  nombre?: string;
  nombreCompleto?: string;
  telefono?: string;
  calle?: string;
  numero?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  pais?: string;
  referencias?: string;
  instruccionesEntrega?: string;
  email?: string;
};

export type Orden = {
  id: string;
  usuarioId?: string;
  estado: OrderStatus | string;
  total: number;
  subtotal?: number;
  subtotalOriginal?: number;
  shippingCost?: number;
  impuestos?: number;
  discountTotal?: number;
  descuentoCodigoPromocion?: number;
  codigoPromocion?: string;
  codigoPromocionTitulo?: string;
  metodoPago?: string;
  paymentStatus?: OrderPaymentState | string;
  preparationStatus?: PreparationStatus | string;
  fulfillmentMethod?: FulfillmentMethod;
  fulfillmentStatus?: FulfillmentStatus | string;
  items?: OrdenItem[];
  direccionEnvio?: OrderDireccionEnvio;
  numeroGuia?: string;
  transportista?: string;
  shipping?: OrderShipping;
  shippingHistory?: OrderStatusHistoryEntry[];
  pickupLocation?: {
    id?: string;
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
  };
  pickupInstructions?: string;
  pickupContact?: { name?: string; phone?: string; email?: string };
  pickupCodeLast4?: string;
  pickupQrPayload?: string;
  readyForPickupAt?: string;
  pickedUpAt?: string;
  pickupExpiresAt?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Pago = {
  id: string;
  ordenId: string;
  provider?: "stripe" | string;
  paymentIntentId?: string;
  clientSecret?: string;
  status: PaymentStatus | string;
  monto?: number;
  moneda?: string;
  totalRefundedAmount?: number;
  refunds?: RefundItem[];
  createdAt?: string;
};

export type CheckoutPayload = {
  fulfillmentMethod?: CheckoutFulfillmentMethod;
  direccionEnvio?: {
    nombre: string;
    calle: string;
    numero: string;
    numeroInterior?: string;
    colonia: string;
    ciudad: string;
    estado: string;
    codigoPostal: string;
    stateOrProvinceCode?: string;
    countryCode?: "MX";
    postalCode?: string;
    telefono: string;
    referencias?: string;
    addressValidationStatus?: AddressValidationStatus;
  };
  shippingAddress?: {
    streetLines: string[];
    city?: string;
    stateOrProvinceCode?: string;
    postalCode: string;
    countryCode: string;
    residential?: boolean;
  };
  fedexAddress?: {
    streetLines: string[];
    city?: string;
    stateOrProvinceCode?: string;
    postalCode: string;
    countryCode: string;
    residential?: boolean;
  };
  pickupLocationId?: string;
  pickupContact?: {
    name: string;
    phone?: string;
    email?: string;
  };
  metodoPago: PaymentMethod;
  codigoPromocion?: string;
  shippingQuoteId?: string;
  selectedShippingOptionId?: string;
  selectedServiceType?: string;
  shippingSelection?: ShippingSelection;
  notas?: string;
};

export type CheckoutResponse = {
  ordenId: string;
  estado?: string;
  total?: number;
};

export type PaymentInitPayload = {
  ordenId: string;
  metodoPago: PaymentMethod;
};

export type PaymentInitResponse = {
  pagoId: string;
  paymentIntentId: string;
  clientSecret: string;
  status: string;
};

export type RefundItem = {
  id?: string;
  status?: string;
  refundState?: "requested" | "processing" | "succeeded" | "failed" | string;
  refundDate?: string | null;
  amount?: number;
};

export type RefundRequest = {
  paymentAttemptId: string;
  reason: string;
  amount?: number;
};

export type RefundStatus =
  | "requested"
  | "processing"
  | "completed"
  | "failed";

export type RefundSummary = {
  refundId?: string;
  status: RefundStatus;
  amount: number;
  reason?: string;
  createdAt?: string;
};

export type PaymentTimelineEvent = {
  id: string;
  type:
    | "attempt_created"
    | "qr_generated"
    | "link_sent"
    | "status_checked"
    | "checkout_opened"
    | "payment_approved"
    | "payment_canceled"
    | "attempt_expired"
    | "webhook_received"
    | "refund_requested"
    | "refund_completed"
    | "refund_failed"
    | "manual_action";
  title: string;
  description?: string;
  createdAt: string;
  status?: string;
};

export type CatalogSort =
  | "destacados"
  | "populares"
  | "mas_comprados"
  | "precio_asc"
  | "precio_desc"
  | "recientes"
  | "nombre_asc"
  | "ofertas_populares"
  | "ofertas_mas_compradas"
  | "ofertas_recientes";

export type CatalogQuery = {
  limit?: number; // default 24, max 48
  cursor?: string;
  category?: string;
  categoria?: string;
  line?: string;
  linea?: string;
  talla?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  q?: string;
  onlyOffers?: boolean;
  onlyAvailable?: boolean;
};

export type CatalogProductCard = {
  id: string;
  slug: string;
  nombre: string;
  categoria: string;
  categoriaLabel: string;
  linea: string;
  lineaLabel: string;
  precioOriginal: number;
  precioFinal: number;
  tieneOferta: boolean;
  ofertaAplicadaId: string | null;
  ofertaTitulo: string | null;
  descuentoTotal: number;
  porcentajeDescuento?: number;
  imagenPrincipal: string | null;
  imagenes?: string[];
  stockTotal: number;
  stockFisico?: number;
  disponible: boolean;
  destacado: boolean;
};

export type CatalogResponse = {
  items: CatalogProductCard[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type AdminProductStatus = "todos" | "activo" | "inactivo";

export type AdminProductListItem = {
  id: string;
  clave: string;
  descripcion: string;
  slug: string;
  lineaId: string;
  categoriaId: string;
  precioPublico: number;
  existencias: number;
  disponible: boolean;
  destacado: boolean;
  activo: boolean;
  imagenPrincipal: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AdminProductsResponse = {
  success: boolean;
  count: number;
  data: AdminProductListItem[];
};
