with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

content = content.replace('{product.stockTotal ?? product.stock}', '{product.existencias}')
content = content.replace('{product.hasSizeInventory ? " (Tallas)" : ""}', '')
content = content.replace('!product.images?.length', '!product.imagenPrincipal')
content = content.replace('product.images?.[0]', 'product.imagenPrincipal')
content = content.replace('{product.lineName}', '{product.lineaId}')
content = content.replace('formatCurrency(product.price)', 'formatCurrency(product.precioPublico)')

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
