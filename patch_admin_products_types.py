with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Fix search query fields
content = content.replace('${product.name} ${product.description} ${product.category} ${product.lineName ?? ""} ${product.clave ?? ""}', '${product.descripcion} ${product.clave ?? ""} ${product.categoriaId ?? ""} ${product.lineaId ?? ""}')

# Fix openForm setting values from AdminProductListItem instead of Product
def open_form_replace(match):
    return """
      setFormData({
        descripcion: product.descripcion || "",
        clave: product.clave || "",
        precioPublico: toStringValue(product.precioPublico),
        precioCompra: "", // Cannot get from list item
        existencias: toStringValue(product.existencias),
        proveedorId: "", // Cannot get from list item
        categoriaId: product.categoriaId || "",
        lineaId: product.lineaId || "",
        tallaIds: [], // Need detail API call for this
        inventarioPorTalla: [],
        fedexShipping: {
          enabled: true,
          weightKg: "",
          lengthCm: "",
          widthCm: "",
          heightCm: "",
        },
        imagenes: product.imagenPrincipal ? [product.imagenPrincipal] : [],
        detalles: [],
        activo: product.activo ?? true,
      });
"""
content = re.sub(r'setFormData\(\{\s*descripcion: product\.name \|\| "",[\s\S]*?\}\);', open_form_replace, content)

# Also fix the mapping of product in the option picker
content = content.replace('label: product.name,', 'label: product.descripcion,')

# Fix TableRow cell renders
content = content.replace('{product.stockTotal ?? product.stock}', '{product.existencias}')
content = content.replace('{product.hasSizeInventory ? " (Tallas)" : ""}', '')
content = content.replace('product.images?.[0]', 'product.imagenPrincipal')
content = content.replace('alt={product.name}', 'alt={product.descripcion}')
content = content.replace('className="font-medium">{product.name}</div>', 'className="font-medium">{product.descripcion}</div>')
content = content.replace('{product.description}', '{""}') # Removing description display as it's the main name now
content = content.replace('product.category', 'product.categoriaId')
content = content.replace('{product.lineName}', '{product.lineaId}')
content = content.replace('formatCurrency(product.price)', 'formatCurrency(product.precioPublico)')

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
