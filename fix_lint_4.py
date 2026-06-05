import re

with open("src/app/products/product-filters.tsx", "r") as f:
    content = f.read()

content = content.replace("normalizeStorefrontText,", "")

with open("src/app/products/product-filters.tsx", "w") as f:
    f.write(content)
