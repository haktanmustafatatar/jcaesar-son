/**
 * Official Shopify Admin API Integration
 */

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
}

export async function searchShopifyProducts(config: ShopifyConfig, query: string) {
  try {
    const { shopDomain, accessToken } = config;
    // Query with limit=250 to fetch all products for robust local searching
    const url = `https://${shopDomain}/admin/api/2024-04/products.json?limit=250`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    const queryLower = query.toLowerCase().trim();
    
    const filteredProducts = data.products.filter((p: any) => {
      if (!queryLower) return true;
      const titleMatch = p.title.toLowerCase().includes(queryLower);
      const handleMatch = p.handle.toLowerCase().includes(queryLower);
      const skuMatch = p.variants.some((v: any) => v.sku && v.sku.toLowerCase().includes(queryLower));
      return titleMatch || handleMatch || skuMatch;
    });

    return filteredProducts.map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      status: p.status,
      variants: p.variants.map((v: any) => ({
        id: v.id,
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventory_quantity: v.inventory_quantity,
      })),
    }));
  } catch (error) {
    console.error("[ShopifyIntegration] Search failed:", error);
    return [];
  }
}

export async function getShopifyInventory(config: ShopifyConfig, variantId: string) {
  try {
    const { shopDomain, accessToken } = config;
    // For Custom Apps, we can just get the product/variant directly
    const url = `https://${shopDomain}/admin/api/2024-04/variants/${variantId}.json`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      id: data.variant.id,
      sku: data.variant.sku,
      inventory: data.variant.inventory_quantity,
      price: data.variant.price
    };
  } catch {
    return null;
  }
}
export async function getShopifyOrdersByEmail(config: ShopifyConfig, email: string) {
  try {
    const { shopDomain, accessToken } = config;
    const url = `https://${shopDomain}/admin/api/2024-04/orders.json?email=${encodeURIComponent(email)}&status=any&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.orders.map((o: any) => ({
      id: o.id,
      order_number: o.name,
      created_at: o.created_at,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status || "unfulfilled",
      total_price: o.total_price,
      order_status_url: o.order_status_url,
      customer_name: o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "N/A"
    }));
  } catch (error) {
    console.error("[ShopifyIntegration] Order fetch failed:", error);
    return [];
  }
}
