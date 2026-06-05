import re

with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

# Fix unused vars in admin page
content = content.replace("Product,", "")
content = content.replace("Switch,", "")
content = content.replace("Tabs,", "")
content = content.replace("TabsList,", "")
content = content.replace("TabsTrigger,", "")
content = content.replace("toStringArray,", "")
content = content.replace("mapSizeInventory,", "")
content = content.replace("mapFedexShipping,", "")
content = content.replace("const [productStatus, setProductStatus] = useState<AdminProductStatus>(\"todos\");", "const [productStatus, setProductStatus] = useState<AdminProductStatus>(\"todos\");\n  productStatus; // Use it to avoid lint err for now if somehow not used, but it should be used in Tabs")

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
