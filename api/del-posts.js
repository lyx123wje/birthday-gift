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
    // 获取所有帖子
    const rawPosts = await kv.lrange('posts', 0, -1);
    const posts = (rawPosts || []).map(function(p) {
      return typeof p === 'string' ? JSON.parse(p) : p;
    });

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

    // 清空 KV 列表
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
