/**
 * Generates aviso de privacidad content and page from structured legal data.
 * Run: node scripts/generate-aviso-content.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CORREO_PRIVACIDAD = "laguaridadelleon1944@gmail.com";
const DOMICILIO_LEGAL =
  "Blvd. Adolfo López Mateos Oriente 1810, Colonia La Martinica, C.P. 37500, León, Guanajuato, México";
const RFC = "FDC101202CG6";
const RESPONSABLE = "Fuerza Deportiva del Club León";
const MARCA = "La Guarida del León";
const SITIO = "https://tiendalaguarida.com";
const ULTIMA_ACTUALIZACION = "26 de junio de 2026";

/** @typedef {{ type: "text"; value: string } | { type: "strong"; value: string } | { type: "link"; href: string; label: string } | { type: "correo" } | { type: "domicilio" }} InlinePart */
/** @typedef {{ type: "paragraph"; parts: InlinePart[] } | { type: "list"; items: string[] } | { type: "subsection"; title: string; blocks: ContentBlock[] }} ContentBlock */
/** @typedef {{ id: string; title: string; blocks: ContentBlock[] }} AvisoSection */

/** @type {string} */
const AVISO_INTRO =
  "El presente aviso se elaboró considerando la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, cuya última reforma oficial fue publicada el 14 de noviembre de 2025. La autoridad federal competente en materia de protección de datos personales en posesión de particulares es actualmente la Secretaría Anticorrupción y Buen Gobierno.";

/** @type {AvisoSection[]} */
const AVISO_SECTIONS = [
  {
    id: "1",
    title: "1. Identidad y domicilio del responsable",
    blocks: [
      {
        type: "paragraph",
        parts: [
          { type: "strong", value: RESPONSABLE },
          {
            type: "text",
            value: `, con RFC ${RFC}, comercialmente identificada como "${MARCA}", con domicilio en `,
          },
          { type: "domicilio" },
          {
            type: "text",
            value:
              ", es responsable del tratamiento, uso, almacenamiento, protección y, en su caso, transferencia de los datos personales recabados a través del sitio ",
          },
          { type: "link", href: SITIO, label: SITIO },
          { type: "text", value: "." },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Para cualquier asunto relacionado con privacidad y protección de datos personales, las personas titulares podrán comunicarse mediante:",
          },
        ],
      },
      {
        type: "list",
        items: [
          `Correo electrónico: ${CORREO_PRIVACIDAD}`,
          `Sitio web: ${SITIO}`,
          `Domicilio: ${DOMICILIO_LEGAL}`,
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `Para efectos del presente aviso, ${RESPONSABLE} será denominada indistintamente como "${MARCA}", "la tienda" o "el responsable".`,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    title: "2. Alcance del Aviso de Privacidad",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Este Aviso de Privacidad aplica al tratamiento de datos personales recabados mediante:",
          },
        ],
      },
      {
        type: "list",
        items: [
          `El sitio web ${SITIO}.`,
          "Formularios de registro, inicio de sesión, compra, pago y facturación.",
          "Carrito de compras y proceso de checkout.",
          "Entregas a domicilio y recolecciones en tienda.",
          "Comunicaciones por correo electrónico, teléfono, formularios o mensajería.",
          "Solicitudes de soporte, aclaraciones, cancelaciones o garantías.",
          "Promociones, códigos de descuento, encuestas y campañas comerciales.",
          "Funciones de prueba virtual o generación de imágenes, cuando se encuentren disponibles.",
          "Cookies, tecnologías de almacenamiento local y herramientas de medición.",
          `Cualquier otro servicio digital operado directamente por ${MARCA}.`,
        ],
      },
    ],
  },
  {
    id: "3",
    title: "3. Datos personales que podrán recabarse",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Dependiendo de la forma en que la persona usuaria interactúe con la tienda, podrán tratarse las siguientes categorías de información.",
          },
        ],
      },
      {
        type: "subsection",
        title: "3.1 Datos de identificación",
        blocks: [
          {
            type: "list",
            items: [
              "Nombre.",
              "Apellidos.",
              "Fecha de nacimiento, cuando resulte necesaria.",
              "Nombre de usuario.",
              "Identificador interno de cliente.",
              "Firma, únicamente cuando sea necesaria para entregas, aclaraciones o trámites.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.2 Datos de contacto",
        blocks: [
          {
            type: "list",
            items: [
              "Correo electrónico.",
              "Número telefónico.",
              "Domicilio de entrega.",
              "Calle, número exterior e interior.",
              "Colonia.",
              "Código postal.",
              "Municipio o alcaldía.",
              "Ciudad y estado.",
              "Referencias para entrega.",
              "Información de contacto de la persona autorizada para recibir o recoger un pedido.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.3 Datos de cuenta y autenticación",
        blocks: [
          {
            type: "list",
            items: [
              "Correo asociado a la cuenta.",
              "Identificador de usuario.",
              "Fecha de registro.",
              "Historial de inicio de sesión.",
              "Tokens o identificadores de sesión.",
              "Estado de la cuenta.",
              "Preferencias de seguridad.",
              "Información proporcionada por el servicio de autenticación.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.4 Datos de compras y pedidos",
        blocks: [
          {
            type: "list",
            items: [
              "Productos consultados, seleccionados o comprados.",
              "Tallas, cantidades, precios y descuentos.",
              "Productos guardados en el carrito.",
              "Códigos promocionales utilizados.",
              "Número y estado del pedido.",
              "Fecha y hora de la compra.",
              "Método de entrega.",
              "Domicilio de entrega.",
              "Código o folio de recolección en tienda.",
              "Historial de compras.",
              "Información sobre cancelaciones, devoluciones, garantías o reembolsos.",
              "Comunicaciones relacionadas con el pedido.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.5 Datos financieros y patrimoniales",
        blocks: [
          {
            type: "paragraph",
            parts: [{ type: "text", value: "Para gestionar pagos podrán tratarse:" }],
          },
          {
            type: "list",
            items: [
              "Método de pago seleccionado.",
              "Importe de la operación.",
              "Moneda.",
              "Estado del pago.",
              "Identificador de la transacción.",
              "Referencia del procesador de pagos.",
              "Tipo de tarjeta.",
              "Últimos dígitos de la tarjeta, cuando sean proporcionados por el procesador.",
              "Información necesaria para aclaraciones, contracargos o reembolsos.",
              "Indicadores relacionados con prevención de fraude.",
            ],
          },
          {
            type: "paragraph",
            parts: [
              {
                type: "text",
                value:
                  "Los datos completos de tarjetas bancarias, como número completo, fecha de vencimiento y código de seguridad, deberán ser recabados y procesados directamente por el proveedor de pagos correspondiente, como Stripe, conforme a sus propias condiciones y avisos de privacidad. La Guarida del León únicamente recibirá la información necesaria para identificar, confirmar, conciliar y administrar la operación.",
              },
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.6 Datos fiscales",
        blocks: [
          {
            type: "paragraph",
            parts: [
              {
                type: "text",
                value: "Cuando la persona solicite una factura podrán recabarse:",
              },
            ],
          },
          {
            type: "list",
            items: [
              "Registro Federal de Contribuyentes.",
              "Nombre o razón social.",
              "Régimen fiscal.",
              "Código postal fiscal.",
              "Uso del CFDI.",
              "Correo electrónico para envío de la factura.",
              "Constancia de situación fiscal, cuando sea necesaria.",
              "Información relacionada con la operación facturada.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.7 Datos técnicos y de navegación",
        blocks: [
          {
            type: "list",
            items: [
              "Dirección IP.",
              "Identificadores del dispositivo.",
              "Tipo de dispositivo.",
              "Sistema operativo.",
              "Tipo y versión del navegador.",
              "Idioma.",
              "Fecha y hora de acceso.",
              "Dirección de referencia.",
              "Páginas y productos visitados.",
              "Acciones realizadas dentro del sitio.",
              "Eventos de navegación.",
              "Registros de errores.",
              "Información de rendimiento.",
              "Ubicación aproximada derivada de la dirección IP.",
              "Cookies e identificadores similares.",
              "Información almacenada en sesión o almacenamiento local.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.8 Datos de atención al cliente",
        blocks: [
          {
            type: "list",
            items: [
              "Solicitudes de soporte.",
              "Dudas, comentarios o reclamaciones.",
              "Mensajes enviados a la tienda.",
              "Evidencias relacionadas con pedidos, pagos o entregas.",
              "Fotografías de productos o paquetes.",
              "Información proporcionada durante una aclaración.",
              "Respuestas a encuestas.",
              "Reseñas o calificaciones.",
            ],
          },
        ],
      },
      {
        type: "subsection",
        title: "3.9 Fotografías para funciones de prueba virtual",
        blocks: [
          {
            type: "paragraph",
            parts: [
              {
                type: "text",
                value:
                  "Cuando la tienda habilite una función para visualizar productos mediante generación o edición de imágenes, podrán tratarse:",
              },
            ],
          },
          {
            type: "list",
            items: [
              "Fotografías cargadas voluntariamente por la persona usuaria.",
              "Imágenes de prendas o productos seleccionados.",
              "Instrucciones proporcionadas para generar el resultado.",
              "Imágenes generadas por la plataforma.",
              "Datos técnicos necesarios para procesar la solicitud.",
            ],
          },
          {
            type: "paragraph",
            parts: [
              {
                type: "text",
                value:
                  "La participación será voluntaria. Las imágenes no serán utilizadas para autenticar usuarios, identificar biométricamente a las personas, determinar su identidad ni inferir datos sensibles. Cuando esta función utilice proveedores de inteligencia artificial o procesamiento de imágenes, la persona será informada antes de enviar la fotografía.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "4",
    title: "4. Datos personales sensibles",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `${MARCA} no requiere datos personales sensibles para realizar una compra ordinaria.`,
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Se solicita a las personas usuarias no proporcionar mediante formularios, mensajes, reseñas o archivos información relacionada con:",
          },
        ],
      },
      {
        type: "list",
        items: [
          "Estado de salud.",
          "Discapacidad.",
          "Origen racial o étnico.",
          "Creencias religiosas.",
          "Opiniones políticas.",
          "Preferencias sexuales.",
          "Información genética.",
          "Datos biométricos utilizados con fines de identificación.",
          "Cualquier otra categoría de información sensible.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Cuando excepcionalmente resulte indispensable tratar información sensible, se solicitará el consentimiento expreso correspondiente y se implementarán medidas de seguridad reforzadas.",
          },
        ],
      },
    ],
  },
  {
    id: "5",
    title: "5. Formas de obtención de los datos personales",
    blocks: [
      {
        type: "paragraph",
        parts: [{ type: "text", value: "Los datos podrán obtenerse:" }],
      },
      {
        type: "list",
        items: [
          "Directamente de la persona titular al registrarse o comprar.",
          "Mediante formularios, mensajes o solicitudes.",
          "Automáticamente mediante cookies y tecnologías similares.",
          "Mediante proveedores de autenticación y pagos.",
          "A través de empresas de mensajería o logística.",
          "Por medio de plataformas tecnológicas utilizadas por la tienda.",
          "Cuando una persona realice un pedido o envío a nombre de otra.",
          "Mediante fuentes permitidas por la legislación aplicable.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Cuando una persona proporcione datos de un tercero, declara que cuenta con autorización para hacerlo y que ha informado a dicho tercero sobre el tratamiento de sus datos.",
          },
        ],
      },
    ],
  },
  {
    id: "6",
    title: "6. Finalidades primarias y necesarias",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `${MARCA} tratará los datos personales para las siguientes finalidades indispensables:`,
          },
        ],
      },
      {
        type: "list",
        items: [
          "Registrar y administrar cuentas de usuario.",
          "Identificar y autenticar a las personas usuarias.",
          "Mantener la seguridad de las cuentas y sesiones.",
          "Integrar y conservar el carrito de compras.",
          "Mostrar productos, precios, ofertas y promociones.",
          "Validar precios y disponibilidad de inventario.",
          "Procesar solicitudes de compra.",
          "Crear y administrar pedidos.",
          "Procesar y confirmar pagos.",
          "Verificar que un pago haya sido autorizado.",
          "Evitar pagos duplicados o compras sin existencias.",
          "Gestionar entregas a domicilio.",
          "Gestionar recolecciones en tienda.",
          "Generar códigos, folios o comprobantes de recolección.",
          "Informar sobre el estado del pedido.",
          "Enviar confirmaciones de compra, pago, entrega o recolección.",
          "Validar la identidad de quien recibe o recoge un pedido.",
          "Emitir facturas y comprobantes fiscales.",
          "Atender dudas, solicitudes, reclamaciones y aclaraciones.",
          "Gestionar cancelaciones, garantías o reembolsos aplicables.",
          "Detectar y prevenir fraude, abuso, suplantación o actividades ilícitas.",
          "Proteger la seguridad del sitio y de sus sistemas.",
          "Mantener registros de operaciones y auditoría.",
          "Cumplir obligaciones fiscales, contables, mercantiles y de protección al consumidor.",
          "Atender requerimientos de autoridades competentes.",
          "Reconocer, ejercer o defender derechos legales.",
          "Cumplir las obligaciones derivadas de la relación comercial.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La negativa a proporcionar los datos necesarios puede impedir que la tienda procese una compra, entregue un producto, emita una factura o atienda una solicitud.",
          },
        ],
      },
    ],
  },
  {
    id: "7",
    title: "7. Finalidades secundarias y opcionales",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Con autorización de la persona titular, los datos podrán utilizarse para:",
          },
        ],
      },
      {
        type: "list",
        items: [
          "Enviar promociones, cupones y novedades.",
          "Informar sobre nuevos productos.",
          "Enviar comunicaciones comerciales.",
          "Recordar productos abandonados en el carrito.",
          "Personalizar recomendaciones.",
          "Realizar encuestas de satisfacción.",
          "Solicitar reseñas.",
          "Elaborar estadísticas y análisis comerciales.",
          "Medir campañas publicitarias.",
          "Crear audiencias publicitarias.",
          "Mostrar publicidad personalizada.",
          "Mejorar la experiencia de navegación.",
          "Analizar el uso y rendimiento del sitio.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: "Estas finalidades no son necesarias para realizar una compra.",
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          { type: "text", value: "La persona podrá oponerse a ellas mediante:" },
        ],
      },
      {
        type: "list",
        items: [
          "El enlace para cancelar suscripción incluido en los correos.",
          "Las preferencias de su cuenta.",
          "El administrador de cookies.",
          `Una solicitud enviada a ${CORREO_PRIVACIDAD}.`,
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La negativa a recibir publicidad no afectará las compras ni los servicios contratados.",
          },
        ],
      },
    ],
  },
  {
    id: "8",
    title: "8. Consentimiento",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: "Cuando el consentimiento resulte necesario, podrá recabarse mediante:",
          },
        ],
      },
      {
        type: "list",
        items: [
          "Casillas de aceptación.",
          "Botones electrónicos.",
          "Formularios digitales.",
          "Configuraciones de privacidad.",
          "Acciones afirmativas e inequívocas.",
          "Autorizaciones específicas para funciones opcionales.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Las casillas relacionadas con promociones, publicidad, analítica no esencial o prueba virtual deberán mostrarse de forma independiente y no deberán condicionarse a la realización de una compra. Cuando se pretenda utilizar información para una finalidad distinta de las previstas en este aviso, se solicitará nuevamente el consentimiento correspondiente.",
          },
        ],
      },
    ],
  },
  {
    id: "9",
    title: "9. Procesadores de pago",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Los pagos realizados en la tienda podrán ser procesados por Stripe u otros proveedores que sean mostrados expresamente durante el proceso de compra. El proveedor de pagos podrá tratar directamente datos bancarios, datos de la tarjeta, identificadores del dispositivo, información de la transacción, dirección de facturación, indicadores de riesgo e información necesaria para prevenir fraude.",
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La Guarida del León no deberá almacenar el número completo de la tarjeta ni su código de seguridad. La persona usuaria también deberá consultar el aviso de privacidad del proveedor de pagos utilizado.",
          },
        ],
      },
    ],
  },
  {
    id: "10",
    title: "10. Encargados y proveedores de servicios",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `${MARCA} podrá utilizar proveedores que traten datos siguiendo sus instrucciones para prestar servicios de hospedaje, almacenamiento, autenticación, pagos, prevención de fraude, mensajería, facturación, notificaciones, atención al cliente, seguridad, monitoreo, analítica, desarrollo, generación de documentos o procesamiento de imágenes.`,
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Entre las tecnologías que pueden utilizarse, dependiendo de las funciones habilitadas, se encuentran Google Cloud, Firebase, Stripe, Google Analytics, Google Tag Manager, Sentry, servicios de Google para procesamiento de imágenes o inteligencia artificial, y empresas de mensajería o paquetería seleccionadas para cada pedido. Cada proveedor deberá recibir únicamente la información necesaria para cumplir el servicio correspondiente.",
          },
        ],
      },
    ],
  },
  {
    id: "11",
    title: "11. Transferencias de datos personales",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `${MARCA} podrá transferir o comunicar datos personales a:`,
          },
        ],
      },
      {
        type: "list",
        items: [
          "Proveedores de pagos e instituciones financieras, para procesar pagos, confirmar operaciones, prevenir fraude, gestionar contracargos o realizar reembolsos.",
          "Empresas de mensajería y logística, para entregar productos, proporcionar seguimiento y contactar al destinatario.",
          "Proveedores de facturación, para generar, timbrar, entregar y conservar comprobantes fiscales.",
          "Proveedores tecnológicos, para operar la infraestructura, autenticación, seguridad, almacenamiento, comunicaciones y soporte del ecommerce.",
          "Autoridades competentes, cuando exista una obligación legal, requerimiento, orden judicial o procedimiento administrativo.",
          "Asesores y representantes legales, cuando resulte necesario para reconocer, ejercer o defender derechos.",
          "Empresas relacionadas, cuando resulte necesario para la operación interna y dichas empresas estén sujetas a políticas y obligaciones compatibles de protección de datos.",
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "No se venderán ni rentarán bases de datos personales a terceros. Las transferencias que requieran consentimiento se realizarán únicamente después de obtenerlo.",
          },
        ],
      },
    ],
  },
  {
    id: "12",
    title: "12. Tratamiento de datos fuera de México",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Algunos proveedores tecnológicos, de pago, almacenamiento, seguridad o procesamiento de imágenes pueden operar infraestructura ubicada fuera de México. En dichos casos se procurará que los proveedores traten los datos únicamente para prestar el servicio contratado, mantengan medidas de seguridad razonables, respeten obligaciones de confidencialidad y no utilicen los datos para finalidades incompatibles.",
          },
        ],
      },
    ],
  },
  {
    id: "13",
    title: "13. Cookies y tecnologías similares",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `El sitio ${SITIO} puede utilizar cookies, píxeles, etiquetas, almacenamiento local e identificadores similares. Las cookies necesarias se utilizan para mantener la sesión, autenticar cuentas, conservar el carrito, recordar preferencias de privacidad, procesar compras, mantener la seguridad, prevenir fraude y evitar operaciones duplicadas.`,
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              'Las tecnologías no necesarias se utilizarán conforme a la selección realizada por la persona usuaria en el administrador de cookies. Las preferencias podrán modificarse en cualquier momento mediante la opción "Configurar cookies" o consultando nuestra ',
          },
          {
            type: "link",
            href: "/politica-cookies",
            label: "Política de cookies",
          },
          { type: "text", value: "." },
        ],
      },
    ],
  },
  {
    id: "14",
    title: "14. Limitación del uso o divulgación",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La persona titular podrá limitar el uso o divulgación de sus datos personales mediante las configuraciones de su cuenta, el administrador de cookies, el enlace para cancelar suscripción o una solicitud enviada a ",
          },
          { type: "correo" },
          {
            type: "text",
            value:
              ". La solicitud deberá incluir nombre completo, correo asociado a la cuenta, descripción de los usos que desea limitar y medio para recibir respuesta.",
          },
        ],
      },
    ],
  },
  {
    id: "15",
    title: "15. Revocación del consentimiento",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La persona titular podrá revocar su consentimiento para los tratamientos que dependan de este, sin efectos retroactivos, enviando una solicitud a ",
          },
          { type: "correo" },
          {
            type: "text",
            value:
              ' con asunto "Revocación de consentimiento", indicando nombre completo, medio de contacto, tratamiento respecto del cual desea revocar el consentimiento e información que permita localizar sus datos.',
          },
        ],
      },
    ],
  },
  {
    id: "16",
    title: "16. Derechos ARCO",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La persona titular puede ejercer los derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) conforme a la LFPDPPP.",
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La solicitud deberá enviarse a ",
          },
          { type: "correo" },
          {
            type: "text",
            value:
              ' con asunto "Solicitud de derechos ARCO" e incluir nombre completo, domicilio o correo para notificaciones, documento que acredite identidad, descripción de los datos involucrados, derecho que desea ejercer y petición concreta.',
          },
        ],
      },
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La Guarida del León comunicará su determinación dentro de un plazo máximo de 20 días, contado desde la recepción de la solicitud. Cuando la solicitud sea procedente, se hará efectiva dentro de los 15 días siguientes a la comunicación de la respuesta. Los plazos podrán ampliarse una sola vez por un periodo igual cuando las circunstancias lo justifiquen, conforme al artículo 31 de la LFPDPPP vigente.",
          },
        ],
      },
    ],
  },
  {
    id: "17",
    title: "17. Conservación y eliminación de los datos",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Los datos personales serán conservados únicamente durante el tiempo necesario para mantener la relación comercial, procesar compras, cumplir entregas, atender garantías, cumplir obligaciones fiscales y contables, prevenir fraude y atender requerimientos de autoridades. Cuando los datos dejen de ser necesarios serán bloqueados y posteriormente eliminados o anonimizados, salvo obligación legal de conservación.",
          },
        ],
      },
    ],
  },
  {
    id: "18",
    title: "18. Seguridad y confidencialidad",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `${MARCA} establecerá medidas administrativas, técnicas y físicas razonables para proteger los datos personales contra daño, pérdida, alteración, destrucción, acceso no autorizado, divulgación indebida, uso fraudulento o modificación no autorizada, incluyendo controles de acceso, autenticación, cifrado, registros de auditoría, respaldos, monitoreo de seguridad y procedimientos de respuesta a incidentes.`,
          },
        ],
      },
    ],
  },
  {
    id: "19",
    title: "19. Menores de edad",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Los procesos de registro y compra están dirigidos a personas mayores de edad con capacidad legal para contratar. Aunque la tienda comercialice productos infantiles, la cuenta, pago, facturación y datos de entrega deberán ser proporcionados por una persona adulta. La Guarida del León no busca recabar conscientemente datos de menores sin la autorización de sus padres, tutores o representantes legales.",
          },
        ],
      },
    ],
  },
  {
    id: "20",
    title: "20. Tratamientos automatizados y prevención de fraude",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "La tienda y sus proveedores podrán utilizar mecanismos automatizados para detectar actividad sospechosa, prevenir fraude, evitar pagos duplicados, identificar intentos de acceso no autorizado, evitar compras superiores al inventario disponible, validar riesgos técnicos o de seguridad, aplicar límites de solicitudes y enviar operaciones sospechosas a revisión manual.",
          },
        ],
      },
    ],
  },
  {
    id: "21",
    title: "21. Enlaces y plataformas externas",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "El sitio puede incluir enlaces o integraciones de terceros, como procesadores de pago, empresas de mensajería, redes sociales, servicios de autenticación, plataformas de seguimiento o herramientas de soporte. Cada tercero es responsable de sus propias prácticas de privacidad.",
          },
        ],
      },
    ],
  },
  {
    id: "22",
    title: "22. Modificaciones al Aviso de Privacidad",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value: `${MARCA} podrá modificar este Aviso de Privacidad debido a cambios legales, nuevas funciones, nuevos métodos de pago, cambios en proveedores, nuevas finalidades, modificaciones de seguridad o cambios corporativos u operativos. La versión vigente estará disponible en `,
          },
          {
            type: "link",
            href: "/aviso-de-privacidad",
            label: `${SITIO}/aviso-de-privacidad`,
          },
          {
            type: "text",
            value:
              ". Cuando una modificación sea sustancial, podrá comunicarse mediante aviso visible en el sitio, correo electrónico, mensaje dentro de la cuenta o notificación durante el proceso de compra.",
          },
        ],
      },
    ],
  },
  {
    id: "23",
    title: "23. Autoridad competente",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Cuando una persona considere que su derecho a la protección de datos personales ha sido vulnerado, podrá acudir ante la Secretaría Anticorrupción y Buen Gobierno, autoridad federal competente en la materia. Antes de iniciar un procedimiento, puede contactar a La Guarida del León mediante ",
          },
          { type: "correo" },
          { type: "text", value: "." },
        ],
      },
    ],
  },
  {
    id: "24",
    title: "24. Consentimiento de la persona titular",
    blocks: [
      {
        type: "paragraph",
        parts: [
          {
            type: "text",
            value:
              "Al proporcionar voluntariamente sus datos personales después de haber tenido acceso al presente Aviso de Privacidad, la persona reconoce haber sido informada sobre la identidad del responsable, los datos tratados, las finalidades del tratamiento, los mecanismos para limitar su uso, los derechos ARCO, las transferencias y proveedores involucrados, y la forma de consultar modificaciones al aviso. Cuando sea necesario consentimiento expreso, La Guarida del León utilizará mecanismos específicos que permitan dejar constancia de la autorización.",
          },
        ],
      },
    ],
  },
];

function serializeValue(value, indent = 0) {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const lines = value.map((item) => `${padInner}${serializeValue(item, indent + 1)},`);
    return `[\n${lines.join("\n")}\n${pad}]`;
  }

  const entries = Object.entries(value).map(
    ([key, val]) => `${padInner}${JSON.stringify(key)}: ${serializeValue(val, indent + 1)},`,
  );
  return `{\n${entries.join("\n")}\n${pad}}`;
}

function generateContentTs() {
  return `// Auto-generated by scripts/generate-aviso-content.mjs — do not edit manually.

export type InlinePart =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "link"; href: string; label: string }
  | { type: "correo" }
  | { type: "domicilio" };

export type ContentBlock =
  | { type: "paragraph"; parts: InlinePart[] }
  | { type: "list"; items: string[] }
  | { type: "subsection"; title: string; blocks: ContentBlock[] };

export type AvisoSection = {
  id: string;
  title: string;
  blocks: ContentBlock[];
};

export const AVISO_METADATA = {
  title: "Aviso de Privacidad Integral",
  description:
    "Aviso de privacidad integral de La Guarida del León, tienda oficial Club León, conforme a la LFPDPPP.",
  editorialLabel: "Legal",
  lastUpdated: ${JSON.stringify(ULTIMA_ACTUALIZACION)},
} as const;

export const RESPONSABLE = ${JSON.stringify(RESPONSABLE)};
export const RFC_RESPONSABLE = ${JSON.stringify(RFC)};
export const MARCA_COMERCIAL = ${JSON.stringify(MARCA)};
export const DOMICILIO_LEGAL = ${JSON.stringify(DOMICILIO_LEGAL)};
export const CORREO_PRIVACIDAD = ${JSON.stringify(CORREO_PRIVACIDAD)};
export const SITIO_WEB = ${JSON.stringify(SITIO)};

export const AVISO_INTRO = ${JSON.stringify(AVISO_INTRO)};

export const AVISO_SECTIONS: AvisoSection[] = ${serializeValue(AVISO_SECTIONS, 0)};
`;
}

function generatePageTsx() {
  return `import type { Metadata } from "next";
import Link from "next/link";
import {
  AVISO_INTRO,
  AVISO_METADATA,
  AVISO_SECTIONS,
  CORREO_PRIVACIDAD,
  DOMICILIO_LEGAL,
  type ContentBlock,
  type InlinePart,
} from "@/content/aviso-privacidad-content";

// Auto-generated by scripts/generate-aviso-content.mjs — do not edit manually.

export const metadata: Metadata = {
  title: AVISO_METADATA.title,
  description: AVISO_METADATA.description,
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium">{title}</h3>
      {children}
    </div>
  );
}

function InlineParts({ parts }: { parts: InlinePart[] }) {
  return (
    <>
      {parts.map((part, index) => {
        switch (part.type) {
          case "text":
            return <span key={index}>{part.value}</span>;
          case "strong":
            return <strong key={index}>{part.value}</strong>;
          case "link":
            return (
              <Link
                key={index}
                href={part.href}
                className="text-[#d0ad63] underline underline-offset-2"
              >
                {part.label}
              </Link>
            );
          case "correo":
            return (
              <a
                key={index}
                href={\`mailto:\${CORREO_PRIVACIDAD}\`}
                className="text-[#d0ad63] underline underline-offset-2"
              >
                {CORREO_PRIVACIDAD}
              </a>
            );
          case "domicilio":
            return <span key={index}>{DOMICILIO_LEGAL}</span>;
          default:
            return null;
        }
      })}
    </>
  );
}

function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={index}
                className="text-muted-foreground leading-7"
              >
                <InlineParts parts={block.parts} />
              </p>
            );
          case "list":
            return (
              <ul
                key={index}
                className="list-disc space-y-2 pl-5 text-muted-foreground"
              >
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "subsection":
            return (
              <SubSection key={index} title={block.title}>
                <ContentBlocks blocks={block.blocks} />
              </SubSection>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

export default function AvisoDePrivacidadPage() {
  return (
    <div className="container max-w-3xl py-10 md:py-16">
      <p className="editorial-label text-[#d0ad63]">{AVISO_METADATA.editorialLabel}</p>
      <h1 className="mt-3 font-headline text-3xl font-semibold uppercase tracking-[0.04em] md:text-4xl">
        {AVISO_METADATA.title}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Última actualización: {AVISO_METADATA.lastUpdated}
      </p>

      <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
        <p className="text-muted-foreground leading-7">{AVISO_INTRO}</p>

        {AVISO_SECTIONS.map((section) => (
          <Section key={section.id} title={section.title}>
            <ContentBlocks blocks={section.blocks} />
          </Section>
        ))}
      </div>
    </div>
  );
}
`;
}

function writeUtf8(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: "utf8" });
}

const contentPath = path.join(ROOT, "src/content/aviso-privacidad-content.ts");
const pagePath = path.join(ROOT, "src/app/aviso-de-privacidad/page.tsx");

writeUtf8(contentPath, generateContentTs());
writeUtf8(pagePath, generatePageTsx());

console.log("Wrote", contentPath);
console.log("Wrote", pagePath);
