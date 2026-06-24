/**
 * Official WooCommerce REST API Integration
 */

export interface WooCommerceConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export async function searchWooProducts(config: WooCommerceConfig, query: string) {
  try {
    const { baseUrl, consumerKey, consumerSecret } = config;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    // WooCommerce works over HTTPS with Basic Auth
    const url = `${baseUrl}/wp-json/wc/v3/products?search=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    const products = await response.json();
    return products.map((p: any) => ({
      id: p.id,
      title: p.name,
      price: p.price,
      sku: p.sku,
      stock_status: p.stock_status,
      stock_quantity: p.stock_quantity,
      permalink: p.permalink
    }));
  } catch (error) {
    console.error("[WooCommerceIntegration] Search failed:", error);
    return [];
  }
}

export async function getWooProduct(config: WooCommerceConfig, productId: string) {
  try {
    const { baseUrl, consumerKey, consumerSecret } = config;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    const url = `${baseUrl}/wp-json/wc/v3/products/${productId}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

export async function getWooOrdersByEmail(config: WooCommerceConfig, email: string) {
  try {
    const { baseUrl, consumerKey, consumerSecret } = config;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    
    const url = `${baseUrl}/wp-json/wc/v3/orders?email=${encodeURIComponent(email)}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    const orders = await response.json();
    return orders.map((o: any) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      date_created: o.date_created,
      total: o.total,
      currency: o.currency,
      line_items: o.line_items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      shipping: o.shipping
    }));
  } catch (error) {
    console.error("[WooCommerceIntegration] Get orders failed:", error);
    return [];
  }
}
