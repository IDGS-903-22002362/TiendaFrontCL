with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Remove any types
content = re.sub(r'\(detailData\.fedexShipping as any\)', '(detailData.fedexShipping as Record<string, unknown>)', content)

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)

with open("src/app/products/product-filters.tsx", "r") as f:
    content = f.read()

# Fix 'any' type in product-filters.tsx
content = content.replace('defaultValue: any', 'defaultValue: string | number')
# Fix React Hook useEffect dependencies by adding them
content = content.replace('[category, linea, selectedSize, priceRange, sort, searchQuery, tags, router]', '[category, linea, selectedSize, priceRange, sort, searchQuery, tags, router, loadPage, searchParams]')

with open("src/app/products/product-filters.tsx", "w") as f:
    f.write(content)
