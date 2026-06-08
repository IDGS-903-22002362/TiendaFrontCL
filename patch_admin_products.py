with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# 1. Update imports
new_imports = """
  fetchCategories,
  fetchProductById,
} from "@/lib/api/storefront";
"""
content = re.sub(r'fetchCategories,\n\s*fetchProducts,\n\s*fetchProductById,\n\}\s*from\s*"@/lib/api/storefront";', new_imports.strip(), content)

content = re.sub(r'import type \{\n\s*Category,', 'import type {\n  AdminProductListItem,\n  AdminProductStatus,\n  Category,', content)

# 2. Add Switch import
content = content.replace('import { Checkbox } from "@/components/ui/checkbox";', 'import { Checkbox } from "@/components/ui/checkbox";\nimport { Switch } from "@/components/ui/switch";\nimport { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";')

# 3. EMPTY_FORM modifications
content = content.replace('detalles: [] as ProductDetailDraft[],', 'detalles: [] as ProductDetailDraft[],\n  activo: true,')

# 4. State updates
content = content.replace('const [products, setProducts] = useState<Product[]>([]);', 'const [products, setProducts] = useState<AdminProductListItem[]>([]);\n  const [productStatus, setProductStatus] = useState<AdminProductStatus>("todos");')

# 5. loadProducts implementation
new_load_products = """  const loadProducts = useCallback(async (status: AdminProductStatus = productStatus) => {
    setIsLoading(true);
    try {
      const response = await productsAdminApi.fetchAdminProducts("cookie-session", status);
      setProducts(response.data || []);
      setSelectedProductId((current) =>
        current && !(response.data || []).some((product: AdminProductListItem) => product.id === current)
          ? ""
          : current,
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cargar productos",
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [productStatus, toast]);"""

content = re.sub(r'const loadProducts = useCallback\(async \(\) => \{[\s\S]*?\}, \[toast\]\);', new_load_products, content)

# 6. Initial loading
content = content.replace('loadProducts();', 'loadProducts("todos");')

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
