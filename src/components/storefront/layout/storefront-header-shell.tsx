import { fetchCategories } from "@/lib/api/storefront";
import { lineasApi } from "@/lib/api/lineas";
import { buildNavModel } from "@/lib/storefront/navigation";
import { StorefrontHeader } from "./header";

export async function StorefrontHeaderShell() {
  const [categories, lineas] = await Promise.all([
    fetchCategories(),
    lineasApi.getAll({ fresh: false }),
  ]);

  const navModel = buildNavModel(categories, lineas);

  return <StorefrontHeader navModel={navModel} />;
}