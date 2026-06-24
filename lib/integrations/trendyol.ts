/**
 * Trendyol Supplier Integration Library
 * Uses Trendyol Supplier API v1 with Basic Auth (Base64 apiKey:apiSecret)
 * Docs: https://developers.trendyol.com/en
 */

export interface TrendyolConfig {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}

function getTrendyolAuth(config: TrendyolConfig): string {
  const credentials = `${config.apiKey}:${config.apiSecret}`;
  return Buffer.from(credentials).toString("base64");
}

/**
 * Search products in the seller's Trendyol catalog
 */
export async function searchTrendyolProducts(config: TrendyolConfig, query: string) {
  try {
    const auth = getTrendyolAuth(config);
    const url = `https://api.trendyol.com/sapigw/suppliers/${config.supplierId}/products?approved=true&size=50`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": `${config.supplierId} - jcaesars-integration`,
      },
    });

    if (!response.ok) {
      throw new Error(`Trendyol API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const products = data.content || [];
    const queryLower = query.toLowerCase().trim();

    const filtered = queryLower
      ? products.filter((p: any) =>
          p.title?.toLowerCase().includes(queryLower) ||
          p.productCode?.toLowerCase().includes(queryLower) ||
          p.barcode?.toLowerCase().includes(queryLower)
        )
      : products;

    return filtered.map((p: any) => ({
      id: p.id,
      title: p.title,
      productCode: p.productCode,
      barcode: p.barcode,
      salePrice: p.salePrice,
      listPrice: p.listPrice,
      quantity: p.quantity,
      stockCode: p.stockCode,
      approved: p.approved,
      onSale: p.onSale,
      images: p.images?.map((img: any) => img.url) || [],
    }));
  } catch (error) {
    console.error("[TrendyolIntegration] Product search failed:", error);
    return [];
  }
}

/**
 * Get orders associated with a customer (by phone or order number)
 */
export async function getTrendyolOrdersByCustomer(config: TrendyolConfig, query: string) {
  try {
    const auth = getTrendyolAuth(config);
    // Trendyol orders endpoint — filters by order number directly if numeric
    const isOrderNumber = /^\d+$/.test(query.trim());
    const queryParam = isOrderNumber ? `orderNumber=${query.trim()}` : `orderByField=PackageLastModifiedDate&orderByDirection=DESC&size=20`;
    const url = `https://api.trendyol.com/sapigw/suppliers/${config.supplierId}/orders?${queryParam}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": `${config.supplierId} - jcaesars-integration`,
      },
    });

    if (!response.ok) {
      throw new Error(`Trendyol API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const orders = data.content || [];

    return orders.map((o: any) => ({
      orderNumber: o.orderNumber,
      grossAmount: o.grossAmount,
      totalDiscount: o.totalDiscount,
      status: o.status,
      orderDate: o.orderDate,
      shipmentAddress: {
        firstName: o.shipmentAddress?.firstName,
        lastName: o.shipmentAddress?.lastName,
        city: o.shipmentAddress?.city,
      },
      lines: (o.lines || []).map((l: any) => ({
        productName: l.productName,
        quantity: l.quantity,
        amount: l.amount,
        barcode: l.barcode,
      })),
      cargoTrackingNumber: o.cargoTrackingNumber,
      cargoProviderName: o.cargoProviderName,
    }));
  } catch (error) {
    console.error("[TrendyolIntegration] Order fetch failed:", error);
    return [];
  }
}

/**
 * Get a single order by order number
 */
export async function getTrendyolOrderByNumber(config: TrendyolConfig, orderNumber: string) {
  const orders = await getTrendyolOrdersByCustomer(config, orderNumber);
  return orders.find((o: any) => o.orderNumber?.toString() === orderNumber) || null;
}

/**
 * Update stock quantity for a product
 */
export async function updateTrendyolStock(
  config: TrendyolConfig,
  items: { barcode: string; quantity: number; salePrice?: number }[]
) {
  try {
    const auth = getTrendyolAuth(config);
    const url = `https://api.trendyol.com/sapigw/suppliers/${config.supplierId}/products/price-and-inventory`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": `${config.supplierId} - jcaesars-integration`,
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error(`Trendyol stock update failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[TrendyolIntegration] Stock update failed:", error);
    return null;
  }
}
