with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Fix openForm setFormData payload
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
            ? detailData.tallaIds.map((id) => toStringValue(id))
            : [],
          inventarioPorTalla: Array.isArray(detailData.inventarioPorTalla)
            ? (detailData.inventarioPorTalla as ProductSizeStock[])
            : [],
          fedexShipping: {
            enabled: Boolean(detailData.fedexShipping?.enabled ?? true),
            weightKg: toStringValue(detailData.fedexShipping?.weightKg),
            lengthCm: toStringValue(detailData.fedexShipping?.lengthCm),
            widthCm: toStringValue(detailData.fedexShipping?.widthCm),
            heightCm: toStringValue(detailData.fedexShipping?.heightCm),
          },
          imagenes: Array.isArray(detailData.imagenes) ? detailData.imagenes : (product.imagenPrincipal ? [product.imagenPrincipal] : []),
          detalles: detalles.map((d) => createDetailDraft(d.descripcion, d.id)),
          activo: product.activo,
        });"""

content = re.sub(r'setFormData\(\{[\s\S]*?\}\);', open_form_replace, content, count=1)

# Ensure EMPTY_FORM has activo
content = content.replace('EMPTY_FORM = {', 'EMPTY_FORM = {\n  activo: true,')

# Some residual product references in rendering logic
content = content.replace('{product.stockTotal ?? product.stock}', '{product.existencias}')
content = content.replace('{product.hasSizeInventory ? " (Tallas)" : ""}', '')
content = content.replace('product.images?.[0]', 'product.imagenPrincipal')
content = content.replace('alt={product.name}', 'alt={product.descripcion}')
content = content.replace('className="font-medium">{product.name}</div>', 'className="font-medium">{product.descripcion}</div>')
content = content.replace('{product.lineName}', '{product.lineaId}')
content = content.replace('formatCurrency(product.price)', 'formatCurrency(product.precioPublico)')

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
