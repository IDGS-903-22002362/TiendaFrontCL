import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso de la tienda.",
};

export default function TerminosCondicionesPage() {
  return (
    <main className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
      <header className="mb-10 text-center">
        <h1 className="font-headline text-3xl md:text-4xl font-bold mb-4">
          Términos y Condiciones / MANUAL DE POLÍTICAS DE CAMBIOS Y DEVOLUCIONES PARA VENTAS
          EN LÍNEA
        </h1>
        <p className="text-muted-foreground">
          Última actualización: {new Date().toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <article className="prose prose-muted max-w-none space-y-8">
        {/* TODO: Reemplazar con tu contenido real */}
        <section>
          <h2>1. OBJETIVO</h2>
          <p>
            Establecer los lineamientos para la gestión de cambios y devoluciones de productos
            adquiridos a través de la tienda en línea de La Guarida del León, garantizando una
            experiencia de compra transparente, eficiente y satisfactoria para nuestros clientes.
          </p>
          <br></br>
          <p>
            <strong>Titular y responsable legal:</strong> Fuerza Deportiva del Club León S.A. de C.V., con domicilio en Blvd Adolfo Lopez Mateos Oriente 1810, Colonia La Martinica, C.P. 37500, León, Guanajuato.
          </p>
        </section>

        <section>
          <h2>2. ALCANCE</h2>
          <p>
            Las presentes políticas aplican a todas las compras realizadas a través de la página web
            oficial, aplicación móvil y demás plataformas digitales administradas por La Guarida del
            León.
          </p>
        </section>

        <section>
          <h2>3. POLÍTICAS GENERALES</h2>
        </section>

        <section>
          <h3>3.1 Plazo para solicitar cambios</h3>
          <p>
            Los clientes podrán solicitar cambios de mercancía dentro de los quince (15) días
            naturales posteriores a la recepción del pedido.
            Las solicitudes recibidas fuera de este plazo no serán procedentes.
          </p>
        </section>

        <section>
          <h3>3.2 Requisitos para solicitar un cambio</h3>
          <p>
            Para que un producto sea elegible para cambio deberá cumplir con los siguientes
            requisitos:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Haber sido adquirido a través de los canales oficiales de venta en línea.</li>
            <li>Presentar comprobante de compra o número de pedido.</li>
            <li>Encontrarse sin uso.</li>
            <li>Conservar etiquetas originales.</li>
            <li>Mantener su empaque original en buen estado.</li>
            <li>No presentar daños, alteraciones, manchas, olores o señales de uso.</li>
          </ul>
        </section>

        <section>
          <h3>3.3 Solicitud de cambio</h3>
          <p>
            El cliente deberá realizar la solicitud a través de alguno de los siguientes medios:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Portal de atención al cliente. ( laguaridadelleon1944@gmail.com )</li>
            <li>Correo electrónico autorizado. ( laguaridadelleon1944@gmail.com )</li>
            <li>WhatsApp oficial de atención. ( 477-918-4579 )</li>
          </ul>
          <p>La solicitud deberá incluir:</p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Nombre completo.</li>
            <li>Número de pedido.</li>
            <li>Motivo del cambio.</li>
            <li>Fotografía del producto en caso de ser requerida.</li>
            <li>Datos de contacto actualizados.</li>
          </ul>
        </section>

        <section>
          <h2>4. CAMBIOS POR TALLA O MODELO</h2>
          <p>
            Los cambios por talla o modelo estarán sujetos a disponibilidad de inventario.
            En caso de no existir disponibilidad del producto solicitado, el cliente podrá:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Elegir otro producto de igual valor.</li>
            <li>Seleccionar un producto de mayor valor cubriendo la diferencia correspondiente.</li>
            <li>Recibir un saldo electrónico para futuras compras, previa autorización de la empresa.</li>
          </ul>
        </section>

        <section>
          <h2>5. COSTOS DE ENVÍO PARA CAMBIOS</h2>
        </section>

        <section>
          <h3>5.1 Solicitud de cambio</h3>
          <p>
            Cuando el cambio sea solicitado por motivos de talla, color, modelo o preferencia
            personal:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>El costo de envío de retorno correrá por cuenta del cliente.</li>
            <li>El costo del nuevo envío será cubierto por el cliente, salvo promociones vigentes.</li>
          </ul>
        </section>

        <section>
          <h3>5.2 Error atribuible a La Guarida del León</h3>
          <p>
            Cuando el producto recibido:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Sea diferente al solicitado.</li>
            <li>Presente defectos de fabricación.</li>
            <li>Corresponda a un error de surtido.</li>
          </ul>
          <p>La empresa absorberá los costos de recolección y reenvío.</p>
        </section>

        <section>
          <h2>6. DEVOLUCIONES</h2>
          <p>
            No se realizarán devoluciones de dinero salvo en los siguientes casos:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Producto defectuoso de origen.</li>
            <li>Producto incorrecto enviado por la empresa.</li>
            <li>Imposibilidad de surtir el producto adquirido.</li>
          </ul>
          <p>
            La devolución autorizada se realizará utilizando el mismo método de pago empleado en la
            compra, de acuerdo con los tiempos establecidos por la institución financiera
            correspondiente.
          </p>
        </section>

        <section>
          <h2>7. PRODUCTOS SIN CAMBIO NI DEVOLUCIÓN</h2>
          <p>
            No aplicarán cambios ni devoluciones en los siguientes casos:
          </p>
        </section>

        <section>
          <h3>7.1 Productos en promoción</h3>
          <p>
            Artículos adquiridos con descuentos especiales, promociones, ofertas temporales o
            campañas comerciales.
          </p>
        </section>

        <section>
          <h3>7.2 Productos personalizados</h3>
          <p>
            Productos intervenidos, personalizados, bordados, estampados o modificados a solicitud
            del cliente.
          </p>
        </section>

        <section>
          <h3>7.3 Productos en liquidación</h3>
          <p>
            Artículos identificados como remate, liquidación o venta final.
          </p>
        </section>

        <section>
          <h3>7.4 Productos usados</h3>
          <p>
            Mercancía que presente evidencia de uso, lavado, alteración o daño posterior a la entrega.
          </p>
        </section>

        <section>
          <h2>8. TIEMPOS DE PROCESAMIENTO</h2>
          <p>
            Una vez recibido el producto en nuestras instalaciones:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>La revisión se realizará en un plazo máximo de 5 días hábiles.</li>
            <li>La autorización del cambio será notificada por correo electrónico o WhatsApp.</li>
            <li>El envío del nuevo producto se realizará dentro de los siguientes 3 a 5 días hábiles posteriores a la aprobación.</li>
          </ul>
        </section>

        <section>
          <h2>9. RESPONSABILIDADES DEL CLIENTE</h2>
          <p>
            El cliente deberá:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Verificar tallas, modelos y características antes de finalizar la compra.</li>
            <li>Revisar la mercancía al momento de recibirla.</li>
            <li>Conservar comprobantes de compra y guías de envío.</li>
            <li>Empacar adecuadamente los productos enviados para cambio.</li>
          </ul>
        </section>

        <section>
          <h2>10. DISTRIBUCIÓN POR TIENDAS (APPLE Y GOOGLE)</h2>
          <p>
            La app se distribuye mediante Apple App Store y Google Play Store (las Tiendas). El uso de la app también está sujeto a las reglas de cada Tienda.
          </p>
        </section>

        <section>
          <h2>11. REGISTRO, CUENTA Y SEGURIDAD</h2>
          <ul className="list-disc pl-10 space-y-2">
            <li>Debes proporcionar información veraz y actualizada.</li>
            <li>Eres responsable de custodiar tus credenciales.</li>
            <li>Debes reportar uso no autorizado de tu cuenta al canal oficial de soporte.</li>
          </ul>
        </section>

        <section>
          <h2>12. USO PERMITIDO Y PROHIBIDO</h2>
          <p>Queda prohibido, entre otros:</p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Usar la app para actividades ilícitas o fraudulentas.</li>
            <li>Interferir con la seguridad o disponibilidad del servicio.</li>
            <li>Copiar, distribuir, modificar o explotar contenidos sin autorización.</li>
          </ul>
        </section>

        <section>
          <h2>13. RESPONSABILIDADES DE LA EMPRESA</h2>
          <p>
            La Guarida del León se compromete a:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Brindar información clara sobre productos y tallas.</li>
            <li>Atender las solicitudes dentro de los tiempos establecidos.</li>
            <li>Mantener comunicación constante con el cliente durante el proceso.</li>
            <li>Resolver de manera justa y transparente los casos procedentes.</li>
          </ul>
        </section>

        <section>
          <h3>13.1 ENTREGAS EN ZONAS RURALES O EXTENDIDAS</h3>
          <p>
            La Guarida del León realiza los envíos de sus pedidos a través de empresas de
            mensajería y paquetería externas. En algunos destinos catalogados por las paqueterías
            como zonas extendidas, rurales o de difícil acceso, los tiempos de entrega pueden ser
            mayores a los habituales debido a las rutas de distribución establecidas por cada
            proveedor logístico.
            El cliente reconoce y acepta que, en estos casos, las empresas de mensajería pueden
            realizar entregas únicamente en determinados días de la semana o bajo frecuencias
            limitadas de servicio, situación que se encuentra fuera del control de La Guarida del León.
            Por lo anterior, La Guarida del León no será responsable por retrasos atribuibles a las
            operaciones, logística, programación de rutas, condiciones climáticas, eventos
            extraordinarios o cualquier circunstancia propia de la empresa transportista una vez que el
            pedido haya sido entregado correctamente a la paquetería para su envío.
            No obstante, La Guarida del León brindará apoyo y seguimiento ante la empresa
            transportista para facilitar la localización y entrega del pedido cuando sea necesario.
          </p>
        </section>

        <section>
          <h2>14. VIGENCIA</h2>
          <p>
            Las presentes políticas entran en vigor a partir de su publicación en la página web oficial
            de La Guarida del León y permanecerán vigentes hasta la emisión de una nueva
            actualización.
          </p>
        </section>

        <section>
          <h2>15. PROCESO DE ELIMINACIÓN DE CUENTA</h2>
          <p>
            Cualquier usuario registrado podrá solicitar la baja definitiva de sus datos y credenciales de acceso
            en las plataformas digitales en el momento que lo requiera.
          </p>
          <p>
            Una vez confirmada la solicitud respectiva, el perfil entrará en un periodo de suspensión técnica y
            <strong> se eliminará definitivamente en un plazo de hasta 30 días naturales.</strong>
          </p>
          <p>Durante dicho periodo de 30 días:</p>
          <ol className="list-decimal pl-10 space-y-2">
            <li>El usuario podrá frenar o cancelar el proceso de borrado, validando previamente su identidad legal.</li>
            <li>Las funciones operativas de la cuenta en la plataforma web o móvil se mantendrán limitadas.</li>
            <li>Al concluir el plazo, el borrado será irreversible, perdiendo todo historial de pedidos, accesos y beneficios.</li>
          </ol>
        </section>

        <section>
          <h2>16. AVISO DE PRIVACIDAD - CLUB LEÓN</h2>
          <p>
            <strong>Fuerza Deportiva del Club León S.A. de C.V.</strong>, con domicilio en Blvd Adolfo Lopez Mateos Oriente 1810, Colonia La Martinica, C.P. 37500, León, Guanajuato, es responsable del tratamiento y resguardo de tus datos personales conforme a la normativa aplicable.
          </p>
        </section>

        <section>
          <h3>16.1 Datos que recolectamos</h3>
          <p>
            <strong>Identificación:</strong> Nombre, correo, teléfono y fecha de nacimiento.
          </p>
          <p>
            <strong>Acceso:</strong> Usuario, contraseña o acceso social (Google, Apple).
          </p>
          <p>
            <strong>Uso de la app:</strong> Ubicación solo si la autorizas, modelo de celular, eventos de uso.
          </p>
          <p>
            <strong>Operación comercial:</strong> Referencias de pago y transacciones cifradas para boletaje/tienda.
          </p>
        </section>

        <section>
          <h3>16.2 ¿Para qué los usamos?</h3>
          <p>
            <strong>Fines necesarios:</strong>
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Crear y administrar tu cuenta.</li>
            <li>Procesar pagos de boletaje, Fierabonos y tienda.</li>
            <li>Soporte técnico y validación de accesos digitales al estadio.</li>
          </ul>
          <p>
            <strong>Fines secundarios (opcionales):</strong>
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Promociones exclusivas y alertas de partidos.</li>
            <li>Dinámicas de patrocinadores.</li>
            <li>Personalización de estadísticas y experiencia.</li>
          </ul>
        </section>

        <section id="transferencias">
          <h3>16.3 Transferencias y control</h3>
          <p>
            Los datos solo se comparten con proveedores esenciales (pasarelas de pago, boleteras y servicios tecnológicos críticos), bajo obligaciones de confidencialidad y seguridad.
          </p>
        </section>

        <section>
          <h3>16.4 Derechos ARCO</h3>
          <p>
            Puedes solicitar acceso, rectificación, cancelación u oposición enviando correo a <a href="mailto:aficion@clubleon.mx" className="text-primary underline">aficion@clubleon.mx</a>.
          </p>
        </section>

        <section id="contacto">
          <h2>Contacto</h2>
          <p>
            Para dudas o consultas sobre estos términos, puedes contactarnos en:
          </p>
          <ul className="list-disc pl-10 space-y-2">
            <li>Email: <a href="mailto:laguaridadelleon1944@gmail.com" className="text-primary underline">laguaridadelleon1944@gmail.com</a></li>
            <li>Teléfono: +52 477-918-4579</li>
            <li>Domicilio: Blvd. Adolfo López Mateos, La Martinca, 37500 León de los Aldama, Gto.</li>
          </ul>
        </section>
      </article>

      <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} La Guarida del León. Todos los derechos reservados.
        </p>
      </footer>
    </main>
  );
}