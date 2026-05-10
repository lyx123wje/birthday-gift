// 简单速率限制：单 IP 60 秒内最多 5 次尝试
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  // 清理过期记录
  let record = attempts.get(ip);
  if (record && now - record.start > WINDOW_MS) {
    attempts.delete(ip);
    record = null;
  }

  if (record && record.count >= MAX_ATTEMPTS) {
    const remaining = Math.ceil((WINDOW_MS - (now - record.start)) / 1000);
    return res.status(429).json({ ok: false, error: '尝试次数过多，请 ' + remaining + ' 秒后重试' });
  }

  const password = req.headers['x-admin-password'];
  if (password === process.env.ADMIN_PASSWORD) {
    attempts.delete(ip);
    return res.status(200).json({ ok: true });
  }

  // 记录失败
  if (!record) {
    attempts.set(ip, { count: 1, start: now });
  } else {
    record.count += 1;
  }

  return res.status(401).json({ ok: false });
}
