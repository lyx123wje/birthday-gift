import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import Busboy from 'busboy';

export const config = {
  api: { bodyParser: false }
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    let resolved = false;

    const bb = Busboy({
      headers: req.headers,
      limits: { fileSize: 4 * 1024 * 1024, files: 10 }
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, stream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files.push({ filename, contentType: mimeType, data: Buffer.concat(chunks) });
      });
      stream.on('error', (err) => { if (!resolved) { resolved = true; reject(err); } });
    });

    bb.on('close', () => {
      if (!resolved) { resolved = true; resolve({ fields, files }); }
    });

    bb.on('error', (err) => { if (!resolved) { resolved = true; reject(err); } });

    bb.on('filesLimit', () => {
      if (!resolved) { resolved = true; reject(new Error('最多只能上传 10 个文件')); }
    });

    bb.on('partsLimit', () => {
      if (!resolved) { resolved = true; reject(new Error('请求部件数量过多')); }
    });

    bb.on('fieldsLimit', () => {
      if (!resolved) { resolved = true; reject(new Error('请求字段数量过多')); }
    });

    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }

  let uploadedBlobs = [];

  try {
    let fields, files;
    try {
      const result = await parseMultipart(req);
      fields = result.fields;
      files = result.files;
    } catch (e) {
      return res.status(500).json({ error: '表单解析失败: ' + e.message });
    }

    const date = fields.date;
    const caption = fields.caption || '';

    if (!date || files.length === 0) {
      return res.status(400).json({ error: '日期和文件为必填项' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];

    // 检测文件类型：全部图片 / 单个视频
    let hasVideo = files.some(function(f) { return f.contentType.startsWith('video/'); });
    if (hasVideo && files.length > 1) {
      return res.status(400).json({ error: '视频只能单选' });
    }

    for (let i = 0; i < files.length; i++) {
      if (!allowedTypes.includes(files[i].contentType)) {
        return res.status(400).json({ error: '不支持的文件类型: ' + files[i].contentType });
      }
    }

    // 上传所有文件到 Blob
    let mediaItems = [];
    for (let i = 0; i < files.length; i++) {
      try {
        let blob = await put(files[i].filename, files[i].data, {
          access: 'public',
          contentType: files[i].contentType
        });
        uploadedBlobs.push(blob.url);
        mediaItems.push({
          type: files[i].contentType.startsWith('video/') ? 'video' : 'image',
          url: blob.url,
          contentType: files[i].contentType
        });
      } catch (e) {
        return res.status(500).json({ error: 'Blob上传失败(' + (i+1) + '/' + files.length + '): ' + e.message });
      }
    }

    let mediaType = hasVideo ? 'video' : 'image';

    let newPost = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      date: date,
      caption: caption,
      mediaType: mediaType,
      media: mediaItems,
      mediaUrl: mediaItems[0].url,
      createdAt: new Date().toISOString()
    };

    // 原子操作：lpush 避免竞态条件（自动兼容旧格式迁移）
    try {
      await kv.lpush('posts', JSON.stringify(newPost));
    } catch (e) {
      // lpush 失败可能是旧格式（String 类型）冲突，尝试迁移
      try {
        const oldData = await kv.get('posts');
        await kv.del('posts');
        if (oldData && Array.isArray(oldData)) {
          // 反转后逐个 lpush，保持时间顺序（最新在前）
          for (let i = oldData.length - 1; i >= 0; i--) {
            await kv.lpush('posts', JSON.stringify(oldData[i]));
          }
        }
        await kv.lpush('posts', JSON.stringify(newPost));
      } catch (e2) {
        return res.status(500).json({ error: 'KV存储失败（文件已上传）: ' + e2.message });
      }
    }

    return res.status(200).json({ success: true, post: newPost });
  } catch (err) {
    console.error('save-post error:', err);
    // 失败时尝试清理已上传的 Blob
    for (let url of uploadedBlobs) {
      try {
        // Blob URL 即为删除标识，通过 HTTP DELETE 删除
        await fetch(url, { method: 'DELETE' });
      } catch (_) {
        // 静默忽略清理错误
      }
    }
    return res.status(500).json({ error: '保存失败: ' + err.message });
  }
}
