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
  id?: string;
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

export type PaymentMethod = "TARJETA" | "APLAZO";
export type FulfillmentMethod = "DELIVERY" | "PICKUP";

export type FulfillmentStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "EXPIRED"
  | "CANCELED";

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
  status?: FedExShippingStatus;
  quoteId?: string;
  selectedOptionId?: string;
  serviceType?: string;
  serviceName?: string;
  amount?: number;
  currency?: string;
  trackingNumber?: string;
  labelUrl?: string;
  labelStoragePath?: string;
  estimatedDeliveryDate?: string;
  transitTime?: string;
  warnings?: string[];
};

export type AplazoFlowType = "online" | "in_store";
export type AplazoReturnKind = "success" | "failure" | "cancel";

export type AplazoPaymentStatus =
  | "created"
  | "pending_provider"
  | "pending_customer"
  | "authorized"
  | "paid"
  | "canceled"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_refunded";

export type AplazoLegacyPaymentStatus =
  | Uppercase<AplazoPaymentStatus>
  | "PENDING"
  | "APPROVED"
  | "COMPLETED"
  | "CANCELLED"
  | "pending"
  | "approved"
  | "completed"
  | "AUTHORIZED"
  | "authorized";

export type Orden = {
  id: string;
  usuarioId?: string;
  estado: OrderStatus | string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  metodoPago?: string;
  fulfillmentMethod?: FulfillmentMethod;
  fulfillmentStatus?: FulfillmentStatus | string;
  shipping?: OrderShipping;
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
  pickupCodeLast4?: string;
  pickupQrPayload?: string;
  readyForPickupAt?: string;
  pickupExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Pago = {
  id: string;
  ordenId: string;
  provider?: "stripe" | "aplazo" | string;
  paymentAttemptId?: string;
  paymentIntentId?: string;
  clientSecret?: string;
  status: PaymentStatus | string;
  monto?: number;
  moneda?: string;
  totalRefundedAmount?: number;
  refunds?: AplazoRefundItem[];
  createdAt?: string;
};

export type CheckoutPayload = {
  fulfillmentMethod?: FulfillmentMethod;
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

export type AplazoOnlineCreatePayload = {
  orderId: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  total?: number;
  currency?: "MXN";
  items?: Array<{
    productoId?: string;
    id?: string;
    cantidad?: number;
    quantity?: number;
    tallaId?: string;
    [key: string]: unknown;
  }>;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  successUrl?: string;
  failureUrl?: string;
  cancelUrl?: string;
  cartUrl?: string;
  metadata?: {
    cartId?: string;
  };
};

export type AplazoOnlineCreateResponse = {
  ok: true;
  paymentAttemptId: string;
  provider: "aplazo" | string;
  flowType: AplazoFlowType;
  status: AplazoPaymentStatus;
  redirectUrl?: string;
  checkoutUrl?: string;
  expiresAt?: string | null;
};

export type AplazoInStoreCreatePayload = {
  posSessionId: string;
  deviceId: string;
  cajaId: string;
  sucursalId: string;
  vendedorUid: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    productoId: string;
    cantidad: number;
    tallaId?: string;
  }>;
  metadata?: Record<string, string>;
};

export type AplazoInStoreCreateResponse = {
  ok: true;
  paymentAttemptId: string;
  provider: "aplazo" | string;
  flowType: AplazoFlowType;
  status: AplazoPaymentStatus;
  redirectUrl?: string;
  checkoutUrl?: string;
  paymentLink?: string;
  qrCodeUrl?: string;
  qrImageUrl?: string;
  qrString?: string;
  expiresAt?: string | null;
};

export type AplazoPaymentStatusResponse = {
  ok: true;
  paymentAttemptId: string;
  provider: "aplazo" | string;
  status: AplazoPaymentStatus;
  providerStatus?: string;
  amount?: number;
  currency?: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  isTerminal: boolean;
  nextPollAfterMs?: number;
};

export type AplazoReturnResponse = {
  ok: true;
  paymentAttemptId?: string;
  provider: "aplazo" | string;
  status: AplazoPaymentStatus;
  message?: string;
  isTerminal: boolean;
  nextPollAfterMs?: number;
};

export type AplazoAdminActionResponse = {
  ok: true;
  paymentAttemptId: string;
  provider: "aplazo";
  status: AplazoPaymentStatus;
  providerStatus?: string;
};

export type AplazoRefundRequestPayload = {
  reason?: string;
  refundAmountMinor?: number;
};

export type AplazoRefundRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processed";

export type AplazoRefundRequest = {
  id: string;
  provider: "aplazo";
  orderId: string;
  paymentAttemptId: string;
  userId: string;
  reason: string;
  status: AplazoRefundRequestStatus;
  refundAmount?: number;
  refundAmountMinor?: number;
  providerRefundId?: string;
  providerStatus?: string;
  rejectionReason?: string;
  lastProcessingError?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  processedAt?: string;
  rejectedAt?: string;
};

export type AplazoRefundRequestResponse = {
  ok: true;
  data: AplazoRefundRequest;
};

export type AplazoRefundRequestListResponse = {
  ok: true;
  count: number;
  data: AplazoRefundRequest[];
};

export type AplazoRefundItem = {
  id?: string;
  status?: string;
  refundState?: "requested" | "processing" | "succeeded" | "failed" | string;
  refundDate?: string | null;
  amount?: number;
};

export type AplazoRefundStatusResponse = {
  ok: true;
  paymentAttemptId: string;
  provider: "aplazo";
  status: AplazoPaymentStatus;
  refundState?: string;
  providerStatus?: string;
  refundId?: string;
  refundAmount?: number;
  totalRefundedAmount: number;
  currency: string;
  refunds: AplazoRefundItem[];
};

export type AplazoRefundCreateResponse = AplazoRefundStatusResponse;

export type AplazoActionResult = {
  ok: boolean;
  message: string;
  technicalMessage?: string;
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
  status?: AplazoPaymentStatus | string;
};
