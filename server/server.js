const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41111;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const REPLIES_FILE = path.join(DATA_DIR, 'replies.json');
const ADMIN_TOKEN = 'admin-secret-key-2024';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(REPLIES_FILE)) {
  fs.writeFileSync(REPLIES_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readReplies() {
  const data = fs.readFileSync(REPLIES_FILE, 'utf8');
  return JSON.parse(data);
}

function writeReplies(replies) {
  fs.writeFileSync(REPLIES_FILE, JSON.stringify(replies, null, 2));
}

function verifyAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '无权访问' });
  }
  next();
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕');

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/replies', (req, res) => {
  try {
    const { secretId, content } = req.body;

    if (!secretId || !content || !content.trim()) {
      return res.status(400).json({ error: '回复内容和秘密ID不能为空' });
    }

    if (content.trim().length > 200) {
      return res.status(400).json({ error: '回复不能超过200字' });
    }

    const secrets = readSecrets();
    const secret = secrets.find(s => s.id === secretId);
    if (!secret) {
      return res.status(404).json({ error: '秘密不存在' });
    }

    const replies = readReplies();
    const newReply = {
      id: uuidv4(),
      secretId: secretId,
      content: content.trim(),
      status: '待审核',
      createdAt: new Date().toISOString()
    };

    replies.push(newReply);
    writeReplies(replies);

    res.json({
      success: true,
      message: '回复已提交，等待审核',
      reply: {
        id: newReply.id,
        status: newReply.status
      }
    });
  } catch (error) {
    console.error('提交回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/:id/replies', (req, res) => {
  try {
    const { id } = req.params;
    const replies = readReplies();
    const approvedReplies = replies
      .filter(r => r.secretId === id && r.status === '已通过')
      .map(r => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      replies: approvedReplies
    });
  } catch (error) {
    console.error('获取回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/admin/replies/pending', verifyAdmin, (req, res) => {
  try {
    const replies = readReplies();
    const secrets = readSecrets();
    const secretMap = {};
    secrets.forEach(s => {
      secretMap[s.id] = s.content;
    });

    const pendingReplies = replies
      .filter(r => r.status === '待审核')
      .map(r => ({
        id: r.id,
        secretId: r.secretId,
        secretContent: secretMap[r.secretId] || '秘密已删除',
        content: r.content,
        createdAt: r.createdAt
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({
      replies: pendingReplies
    });
  } catch (error) {
    console.error('获取待审核回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/admin/replies/:id/approve', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const replies = readReplies();
    const replyIndex = replies.findIndex(r => r.id === id);

    if (replyIndex === -1) {
      return res.status(404).json({ error: '回复不存在' });
    }

    replies[replyIndex].status = '已通过';
    writeReplies(replies);

    res.json({
      success: true,
      message: '审核通过'
    });
  } catch (error) {
    console.error('审核回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/admin/replies/:id/reject', verifyAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const replies = readReplies();
    const replyIndex = replies.findIndex(r => r.id === id);

    if (replyIndex === -1) {
      return res.status(404).json({ error: '回复不存在' });
    }

    replies[replyIndex].status = '已拒绝';
    writeReplies(replies);

    res.json({
      success: true,
      message: '已拒绝'
    });
  } catch (error) {
    console.error('拒绝回复时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
