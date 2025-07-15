const express = require('express');
const WebSocket = require('ws');
const crypto = require('crypto');
const cors = require('cors');
const { URL, URLSearchParams } = require('url');

const app = express();
app.use(cors());
app.use(express.json()); // 支持json请求体

class WsParam {
  constructor(APPID, APIKey, APISecret, sparkUrl) {
    this.APPID = APPID;
    this.APIKey = APIKey;
    this.APISecret = APISecret;
    this.sparkUrl = sparkUrl;
    const urlObj = new URL(sparkUrl);
    this.host = urlObj.host;
    this.path = urlObj.pathname;
  }

  createUrl() {
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${this.host}\ndate: ${date}\nGET ${this.path} HTTP/1.1`;
    const signatureSha = crypto.createHmac('sha256', this.APISecret).update(signatureOrigin).digest('base64');
    const authorizationOrigin = `api_key="${this.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureSha}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    const params = new URLSearchParams({
      authorization,
      date,
      host: this.host,
    });
    return `${this.sparkUrl}?${params.toString()}`;
  }
}

class SparkAPI {
  constructor(appid, apiKey, apiSecret, sparkUrl = 'wss://spark-api.xf-yun.com/v1/x1', domain = 'x1') {
    this.appid = appid;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.sparkUrl = sparkUrl;
    this.domain = domain;

    // AI角色设定，简短易懂且有礼貌
    this.messageHistory = [
      {
        role: 'system',
        content: `你是一位专业的道路安全数据分析师，擅长用简短、通俗的语言给出礼貌且实用的交通安全建议。`
      }
    ];
  }

  appendMessage(role, content) {
    this.messageHistory.push({ role, content });
    while (this.getHistoryLength() > 8000) {
      this.messageHistory.shift();
    }
  }

  getHistoryLength() {
    return this.messageHistory.reduce((acc, m) => acc + m.content.length, 0);
  }
}

const appid = '2fb081ac';
const apiKey = 'a333dae3b265d577d4f2ac430e6ed782';
const apiSecret = 'YWRmODg3YzE1MDQ4YWRhMDkyNWNlYjll';

const client = new SparkAPI(appid, apiKey, apiSecret);

app.get('/api/chat/stream', (req, res) => {
  const question = req.query.question;
  if (!question || typeof question !== 'string') {
    res.status(400).send('缺少有效的question参数');
    return;
  }

  // SSE 头部设置
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.flushHeaders();

  client.appendMessage('user', question);

  const wsParam = new WsParam(client.appid, client.apiKey, client.apiSecret, client.sparkUrl);
  const url = wsParam.createUrl();
  const ws = new WebSocket(url);

  let answer = '';

  ws.on('open', () => {
    const reqData = {
      header: {
        app_id: client.appid,
        uid: '1234',
      },
      parameter: {
        chat: {
          domain: client.domain,
          temperature: 0.3,
          max_tokens: 2048,
        },
      },
      payload: {
        message: {
          text: client.messageHistory,
        },
      },
    };
    ws.send(JSON.stringify(reqData));
  });

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.header?.code !== 0) {
        ws.close();
        res.write(`event: error\ndata: ${data.header.message}\n\n`);
        res.end();
        return;
      }

      const choices = data.payload?.choices;
      if (!choices) return;

      const status = choices.status;
      const text = choices.text?.[0]?.content;

      if (text) {
        answer += text;
        // 实时推送给前端
        res.write(`data: ${text.replace(/\n/g, '\\n')}\n\n`);
      }

      if (status === 2) {
        client.appendMessage('assistant', answer);
        res.write(`event: end\ndata: 完成\n\n`);
        res.end();
        ws.close();
      }
    } catch (e) {
      ws.close();
      res.write(`event: error\ndata: ${e.message}\n\n`);
      res.end();
    }
  });

  ws.on('error', (err) => {
    res.write(`event: error\ndata: ${err.message}\n\n`);
    res.end();
  });

  req.on('close', () => {
    // 客户端断开连接时关闭ws，防止内存泄漏
    ws.close();
  });
});

// 简单 POST 接口提示使用流式接口
app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: '请求体必须包含字符串类型的question字段' });
  }
  try {
    res.status(501).json({ error: '请使用 /api/chat/stream 进行流式交互' });
  } catch (err) {
    res.status(500).json({ error: err.message || '调用AI服务失败' });
  }
});

const PORT = 4550;
app.listen(PORT, () => {
  console.log(`服务启动，监听端口 ${PORT}`);
  console.log(`GET http://localhost:${PORT}/api/chat/stream?question=你的问题`);
});
