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

    // 先尝试新格式 (lpush/lrange Redis List)
    let rawPosts = await kv.lrange('posts', 0, -1);

    let posts;
    if (rawPosts && rawPosts.length > 0) {
      // 新格式：每个元素是 JSON 字符串
      posts = rawPosts.map(function(p) {
        return typeof p === 'string' ? JSON.parse(p) : p;
      });
    } else {
      // 回退旧格式 (kv.set 存 JSON 数组)
      const oldData = await kv.get('posts');
      posts = oldData || [];
    }

    // 更新缓存
    cache = { data: posts, timestamp: now };

    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30');
    return res.status(200).json(posts);
  } catch (err) {
    console.error('get-posts error:', err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
}
