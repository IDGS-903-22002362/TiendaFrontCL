with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Fix extractDetailRecord any typing issues by asserting detailData type implicitly through usage,
# but the real issue is `detailData` might not have fedexShipping and `detalles` wasn't defined
def open_form_replace(match):
    return """        setFormData({
          descripcion: product.descripcion || "",
          clave: product.clave || `PROD-${product.id.slice(0, 6).toUpperCase()}`,
          precioPublico: toStringValue(product.precioPublico),
          precioCompra: toStringValue(detailData.precioCompra, "0"),
          existencias: toStringValue(product.existencias, "0"),
          proveedorId: toStringValue(detailData.proveedorId, ""),
          categoriaId: product.categoriaId || "",
          lineaId: product.lineaId || "",
          tallaIds: Array.isArray(detailData.tallaIds)
            ? detailData.tallaIds.map((id: unknown) => toStringValue(id))
            : [],
          inventarioPorTalla: Array.isArray(detailData.inventarioPorTalla)
            ? (detailData.inventarioPorTalla as ProductSizeStock[])
            : [],
          fedexShipping: {
            enabled: typeof (detailData.fedexShipping as any)?.enabled === 'boolean' ? (detailData.fedexShipping as any)?.enabled : true,
            weightKg: toStringValue((detailData.fedexShipping as any)?.weightKg),
            lengthCm: toStringValue((detailData.fedexShipping as any)?.lengthCm),
            widthCm: toStringValue((detailData.fedexShipping as any)?.widthCm),
            heightCm: toStringValue((detailData.fedexShipping as any)?.heightCm),
          },
          imagenes: Array.isArray(detailData.imagenes) ? detailData.imagenes : (product.imagenPrincipal ? [product.imagenPrincipal] : []),
          detalles: detailItems.map((d: ProductDetailRecord) => createDetailDraft(d.descripcion, d.id)),
          activo: product.activo ?? true,
        });"""

content = re.sub(r'setFormData\(\{[\s\S]*?detalles\.map[\s\S]*?\}\);', open_form_replace, content, count=1)

# Fix remaining product type errors inside the grid/list render
content = content.replace('{product.existencias} unidades', '{product.existencias} unidades')

def row_image_replace(match):
    return """                        {product.imagenPrincipal ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imagenPrincipal}
                            alt={product.descripcion}
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />"""

content = re.sub(r'\{\s*product\.images\?\.\[0\] \? \([\s\S]*?alt=\{product\.descripcion\}[\s\S]*?\/>', row_image_replace, content)
content = content.replace('!product.images?.length', '!product.imagenPrincipal')

content = content.replace('product.name', 'product.descripcion')

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
