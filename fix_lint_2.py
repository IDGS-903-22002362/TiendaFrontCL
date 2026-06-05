with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Fix unknown not assignable to boolean
content = content.replace("typeof (detailData.fedexShipping as Record<string, unknown>)?.enabled === 'boolean' ? (detailData.fedexShipping as Record<string, unknown>)?.enabled : true,", "typeof (detailData.fedexShipping as Record<string, unknown>)?.enabled === 'boolean' ? Boolean((detailData.fedexShipping as Record<string, unknown>)?.enabled) : true,")

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)

with open("src/app/products/product-filters.tsx", "r") as f:
    content = f.read()

# Fix product-filters.tsx getParam typing to be strict
content = content.replace("defaultValue: string | number", "defaultValue: string")
content = content.replace("Number(getParam(\"maxPrice\", 5000))", "Number(getParam(\"maxPrice\", \"5000\"))")

with open("src/app/products/product-filters.tsx", "w") as f:
    f.write(content)
