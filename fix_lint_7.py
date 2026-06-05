import re

with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

content = content.replace("Switch,", "")

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
