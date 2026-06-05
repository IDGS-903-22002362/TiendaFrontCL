with open("src/app/admin/productos/page.tsx", "r") as f:
    content = f.read()

import re

# Fix the render loop where stockTotal, etc were used
def table_row_replace(match):
    return """                filteredProducts.map((product) => {
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {product.imagenPrincipal ? (
                            <img
                              src={product.imagenPrincipal}
                              alt={product.descripcion}
                              className="h-10 w-10 rounded-md object-cover border bg-muted"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center border">
                              <ImageIcon className="h-4 w-4 text-muted-foreground opacity-50" />
                            </div>
                          )}
                          <div className="flex flex-col max-w-[200px]">
                            <span className="truncate">{product.descripcion}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {product.clave || product.id.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {categorias.find((c) => c.id === product.categoriaId)?.name || product.categoriaId || "-"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lineas.find((l) => l.id === product.lineaId)?.nombre || product.lineaId || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        ${(product.precioPublico || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span
                            className={`text-sm ${product.existencias <= 5 ? "text-destructive font-bold" : ""}`}
                          >
                            {product.existencias}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${product.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {product.activo ? "Visible en tienda" : "Oculto"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                            variant="outline"
                            size="sm"
                            onClick={() => openForm(product)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>"""

content = re.sub(r'                filteredProducts\.map\(\(product\) => \{[\s\S]*?<Edit className="h-4 w-4 mr-1" /> Editar\n                          </Button>', table_row_replace, content, count=1)

with open("src/app/admin/productos/page.tsx", "w") as f:
    f.write(content)
