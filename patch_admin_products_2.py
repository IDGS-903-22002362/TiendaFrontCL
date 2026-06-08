with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Add status tabs
new_search_and_tabs = """
        <div className="flex flex-col gap-4">
          <EntityPicker
            options={productOptions}
            label="Búsqueda inteligente de producto"
            searchLabel="Buscar por nombre, clave, categoría o línea"
            selectLabel="Selecciona producto para editar"
            query={productSearchQuery}
            value={selectedProductId}
            onQueryChange={setProductSearchQuery}
            onValueChange={setSelectedProductId}
            isLoading={isLoading}
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

content = re.sub(r'<EntityPicker[\s\S]*?isLoading=\{isLoading\}[\s\S]*?/>', new_search_and_tabs.strip(), content, count=1)

# Modify Table to show "Visible en tienda" badge and active toggle button
new_table_headers = """
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
"""

content = content.replace('<TableHead className="text-right">Acciones</TableHead>\n                </TableRow>\n              </TableHeader>', '<TableHead>Estado</TableHead>\n                  <TableHead className="text-right">Acciones</TableHead>\n                </TableRow>\n              </TableHeader>')

# Replace table row contents
def row_replace(match):
    original = match.group(0)
    # inject state column
    row_state = """
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${product.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                              {product.activo ? "Visible en tienda" : "Oculto"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const nextStatus = !product.activo;
                                  const msg = nextStatus
                                    ? "¿Este producto volverá a mostrarse en la tienda. Continuar?"
                                    : "¿Este producto se ocultará de la tienda pública. Continuar?";
                                  if (window.confirm(msg)) {
                                    try {
                                      await productsAdminApi.setProductActiveStatus(product.id, nextStatus, "cookie-session");
                                      loadProducts(productStatus);
                                    } catch (error) {
                                      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
                                    }
                                  }
                                }}
                              >
                                {product.activo ? "Ocultar" : "Activar"}
                              </Button>
                              <Button
"""
    return original.replace('<TableCell className="text-right">\n                        <div className="flex justify-end gap-2">\n                          <Button', row_state.strip())

content = re.sub(r'<TableCell className="text-right">\s*<div className="flex justify-end gap-2">\s*<Button', row_replace, content)

# Change product type in forms and filtering from Product to AdminProductListItem
content = content.replace('openForm = async (product?: Product)', 'openForm = async (product?: AdminProductListItem)')


# Add "Visible en tienda" Switch in form
form_fields = """
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
"""
switch_field = """
                <div className="flex items-center justify-between rounded-lg border p-4 mb-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Visible en tienda</Label>
                    <p className="text-sm text-muted-foreground">
                      Si está desactivado, el producto no aparecerá en el catálogo público.
                    </p>
                  </div>
                  <Switch
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
"""
content = content.replace(form_fields, switch_field)


with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
