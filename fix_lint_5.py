import re

with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

content = content.replace("  productStatus; // Use it to avoid lint err for now if somehow not used, but it should be used in Tabs", "")

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
