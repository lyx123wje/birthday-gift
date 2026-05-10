import { kv } from '@vercel/kv';

// 简单内存缓存
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 1000; // 30 秒内存缓存

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 检查内存缓存
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_TTL) {
      res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
      return res.status(200).json(cache.data);
    }

    const rawPosts = await kv.lrange('posts', 0, -1);
    const posts = (rawPosts || []).map(function(p) {
      return typeof p === 'string' ? JSON.parse(p) : p;
    });

    // 更新缓存
    cache = { data: posts, timestamp: now };

    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
    return res.status(200).json(posts);
  } catch (err) {
    console.error('get-posts error:', err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
}
