import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }

  try {
    // 获取所有帖子（兼容新旧两种格式）
    let rawPosts = await kv.lrange('posts', 0, -1);
    let posts;
    if (rawPosts && rawPosts.length > 0) {
      posts = rawPosts.map(function(p) {
        return typeof p === 'string' ? JSON.parse(p) : p;
      });
    } else {
      // 回退旧格式
      const oldData = await kv.get('posts');
      posts = oldData || [];
    }

    let deletedBlobs = 0;
    let failedBlobs = 0;

    // 删除每个帖子的 Blob 文件
    for (const post of posts) {
      if (post.media && Array.isArray(post.media)) {
        for (const media of post.media) {
          try {
            await fetch(media.url, { method: 'DELETE' });
            deletedBlobs++;
          } catch (_) {
            failedBlobs++;
          }
        }
      }
    }

    // 清空 KV（无论哪种格式）
    await kv.del('posts');

    return res.status(200).json({
      success: true,
      postsDeleted: posts.length,
      blobsDeleted: deletedBlobs,
      blobsFailed: failedBlobs
    });
  } catch (err) {
    console.error('del-posts error:', err);
    return res.status(500).json({ error: '删除失败: ' + err.message });
  }
}
