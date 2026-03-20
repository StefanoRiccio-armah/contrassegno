import axios from 'axios';

const BC_BASE = () =>
  `https://api.bigcommerce.com/stores/${process.env.BIGCOMMERCE_STORE_HASH}`;

const BC_HEADERS = () => ({
  'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN!,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
});

export async function getOrder(orderId: number) {
  const res = await axios.get(`${BC_BASE()}/v2/orders/${orderId}`, {
    headers: BC_HEADERS()
  });
  return res.data;
}

export async function getOrderShippingAddress(orderId: number) {
  const res = await axios.get(`${BC_BASE()}/v2/orders/${orderId}/shipping_addresses`, {
    headers: BC_HEADERS()
  });
  return res.data?.[0] ?? null;
}

export async function saveOrderMetafields(
  orderId: number,
  metafields: Array<{ key: string; value: string; namespace: string; permission_set: string }>
) {
  await Promise.all(
    metafields.map(meta =>
      axios.post(`${BC_BASE()}/v3/orders/${orderId}/metafields`, meta, {
        headers: BC_HEADERS()
      })
    )
  );
}