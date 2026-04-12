import https from 'https';
import http from 'http';
import querystring from 'querystring';

const SSLC_STORE_ID = 'dokkh69d8a9e2cd86e';
const SSLC_STORE_PASSWD = 'dokkh69d8a9e2cd86e@ssl';
const SSLC_IS_LIVE = false;

const BASE_URL = SSLC_IS_LIVE
  ? 'https://securepay.sslcommerz.com'
  : 'https://sandbox.sslcommerz.com';

export const TEMPLATE_CATALOG = [
  {
    id: 'minimal',
    name: 'Minimal Template',
    description: 'Clean and modern design with subtle accents',
    price: 0,
    free: true,
  },
  {
    id: 'elegant',
    name: 'Elegant Template',
    description: 'Sophisticated gold-bordered design for premium certificates',
    price: 499,
    free: false,
  },
  {
    id: 'professional',
    name: 'Professional Template',
    description: 'Corporate-grade layout with structured credentials',
    price: 799,
    free: false,
  },
  {
    id: 'academic',
    name: 'Academic Template',
    description: 'Classic university-style with formal typography',
    price: 999,
    free: false,
  },
];

export async function initiatePayment({ orderId, amount, customerName, customerEmail, customerPhone, backendUrl, frontendUrl }) {
  const postData = querystring.stringify({
    store_id: SSLC_STORE_ID,
    store_passwd: SSLC_STORE_PASSWD,
    total_amount: amount,
    currency: 'BDT',
    tran_id: orderId,
    success_url: `${backendUrl}/api/payment/success`,
    fail_url: `${backendUrl}/api/payment/fail`,
    cancel_url: `${backendUrl}/api/payment/cancel`,
    ipn_url: `${backendUrl}/api/payment/ipn`,
    cus_name: customerName,
    cus_email: customerEmail,
    cus_phone: customerPhone || '01700000000',
    cus_add1: 'Dhaka',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    shipping_method: 'NO',
    product_name: 'Certificate Template',
    product_category: 'Digital Product',
    product_profile: 'non-physical-goods',
  });

  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/gwprocess/v4/api.php`);
    const lib = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse SSLCommerz response'));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

export async function validatePayment(valId) {
  const url = `${BASE_URL}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${SSLC_STORE_ID}&store_passwd=${SSLC_STORE_PASSWD}&format=json`;
  console.log('Validating payment against URL:', url);
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        console.log('SSLCommerz validation response raw body:', data);
        try { resolve(JSON.parse(data)); } catch (err) { reject(new Error('Validation parse error: ' + err.message)); }
      });
    }).on('error', reject);
  });
}
