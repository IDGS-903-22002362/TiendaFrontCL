import re

with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

# I need to add Tabs component rendering which seems I mistakenly removed or failed to replace properly in `patch_admin_products_2.py`
tabs_to_add = """
        <div className="flex flex-col gap-4">
          <EntityPicker
            label="Búsqueda inteligente de producto"
            searchLabel="Buscar por nombre, clave, categoría o línea"
            selectLabel="Selecciona producto para editar"
            query={productSearchQuery}
            value={selectedProductId}
            options={productOptions}
            onQueryChange={setProductSearchQuery}
            onValueChange={setSelectedProductId}
            allowEmpty
            emptyLabel="Sin selección"
          />
          <Tabs value={productStatus} onValueChange={(val) => {
            setProductStatus(val as AdminProductStatus);
            loadProducts(val as AdminProductStatus);
          }}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="activo">Activos</TabsTrigger>
              <TabsTrigger value="inactivo">Ocultos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
"""

content = re.sub(r'<EntityPicker\n\s*label="Búsqueda inteligente de producto"[\s\S]*?emptyLabel="Sin selección"\n\s*/>', tabs_to_add.strip(), content)

# Fix missing Tabs imports that were removed by previous python script!
content = content.replace('import {   TabsTrigger } from "@/components/ui/tabs";', 'import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";')

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
