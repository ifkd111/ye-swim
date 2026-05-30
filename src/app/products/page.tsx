import { ProductsClient } from "./products-client";
import { getProductsPageData } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { products, mode, viewer } = await getProductsPageData();

  return (
    <ProductsClient
      mode={mode}
      products={products}
      viewerName={viewer.fullName}
      viewerRole={viewer.role}
    />
  );
}
