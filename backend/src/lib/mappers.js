/**
 * Chuyển dòng DB → DTO cùng hình dạng với dữ liệu trong prototype (S.products, S.orders…),
 * để frontend dùng lại nguyên code render (đã thống nhất trong review plan).
 */
import { nextStatuses } from '../domain/orderStatus.js';

const DAY_MS = 864e5;
const ms = (t) => (t == null ? null : t instanceof Date ? t.getTime() : Date.parse(t));

export function toProduct(r) {
  const stock = {};
  const variants = {};
  for (const c of r.colors) {
    stock[c] = {};
    variants[c] = {};
    for (const s of r.sizes) stock[c][s] = 0;
  }
  for (const v of r.variants || []) {
    if (!stock[v.color]) continue;
    stock[v.color][v.size] = v.stock;
    variants[v.color][v.size] = v.id;
  }
  return {
    id: r.id,
    name: r.name,
    kor: r.kor_name || '',
    cat: r.category_id,
    sub: r.sub_type,
    gender: r.gender,
    tpl: r.template,
    tex: r.texture,
    price: r.price,
    sale: r.sale_price || 0,
    sizes: r.sizes,
    colors: r.colors,
    badge: r.badge || '',
    added: Math.max(0, Math.floor((Date.now() - ms(r.created_at)) / DAY_MS)),
    sold: r.sold_count,
    likes: r.likes_count,
    fit: r.fit,
    fabric: r.fabric,
    occasions: r.occasions,
    styles: r.styles,
    photo: r.is_photo,
    status: r.status,
    desc: r.description || '',
    material: r.material || '',
    care: r.care || '',
    base: r.base_image,
    baseColors: r.image_colors,
    stock,
    variants,
    rating: { avg: Number(r.rating_avg || 0), count: Number(r.rating_count || 0) },
  };
}

export function toReview(r, userId) {
  const at = ms(r.created_at);
  return {
    id: r.id,
    pid: r.product_id,
    name: r.display_name,
    rating: r.rating,
    text: r.body,
    at,
    daysAgo: Math.max(0, Math.floor((Date.now() - at) / DAY_MS)),
    verified: r.verified,
    size: r.size,
    color: r.color_code,
    h: r.height_cm,
    w: r.weight_kg,
    fitFeel: r.fit_feel,
    status: r.status,
    img: r.image_url,
    mine: Boolean(userId && r.user_id === userId),
  };
}

export function toOrder(r) {
  return {
    id: r.id,
    cid: r.user_id,
    name: r.recipient_name,
    phone: r.phone,
    address: r.address,
    note: r.note || '',
    ship: r.shipping_method,
    pay: r.payment_method,
    payStatus: r.payment_status,
    items: (r.items || []).map((i) => ({ pid: i.pid, name: i.name, color: i.color, size: i.size, qty: i.qty, price: i.price })),
    sub: r.subtotal,
    discount: r.discount,
    coupon: r.coupon_code || '',
    shipFee: r.shipping_fee,
    total: r.total,
    status: r.status,
    allowedNext: nextStatuses(r.status),
    at: ms(r.created_at),
    history: (r.history || []).map((h) => ({ from: h.from, to: h.to, at: ms(h.at), note: h.note })),
  };
}

export const toCartItem = (r) => ({ variantId: r.variant_id, pid: r.product_id, color: r.color_code, size: r.size, qty: r.quantity });

export const toCategory = (r) => ({ id: r.id, name: r.name, sub: r.description || '', count: r.count ?? undefined });

export const toNotification = (r) => ({
  id: String(r.id),
  type: r.type,
  title: r.title,
  body: r.body,
  link: r.link,
  at: ms(r.created_at),
  read: r.is_read,
});

export const toOutfit = (r) => ({ id: r.id, name: r.name, at: ms(r.created_at), slots: r.slots });

export const toMeasurements = (r) =>
  r ? { height: r.height_cm, weight: r.weight_kg, chest: r.chest_cm, waist: r.waist_cm, hip: r.hip_cm, fit: r.fit_pref } : null;

export const toProfile = (r) => ({
  id: r.id,
  name: r.full_name,
  phone: r.phone || '',
  email: r.email || '',
  address: r.address || '',
  birthday: r.birthday ? (r.birthday instanceof Date ? isoDate(r.birthday) : String(r.birthday).slice(0, 10)) : '',
  role: r.role,
});

function isoDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const toCustomer = (r) => ({
  id: r.id,
  name: r.full_name,
  email: r.email || '',
  phone: r.phone || '',
  address: r.address || '',
  joined: Math.max(0, Math.floor((Date.now() - ms(r.created_at)) / DAY_MS)),
  orders: r.orders,
  spent: r.spent,
});

export const toCoupon = (r) => ({
  code: r.code,
  type: r.type,
  value: r.value,
  minSubtotal: r.min_subtotal,
  label: r.label,
  active: r.active,
  expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
  usageLimit: r.usage_limit,
  usedCount: r.used_count,
});

/** Tin nhắn liên hệ (AC-CON-02). */
export function toContact(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || '',
    topic: r.topic,
    orderCode: r.order_code || '',
    message: r.message,
    status: r.status,
    userId: r.user_id || null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}
