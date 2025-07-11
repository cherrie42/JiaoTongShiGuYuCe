const express = require('express');
const WebSocket = require('ws');
const crypto = require('crypto');
const { URL, URLSearchParams } = require('url');

const app = express();
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

    this.messageHistory = [];
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

  ask(question) {
    return new Promise((resolve, reject) => {
      this.appendMessage('user', question);
      const wsParam = new WsParam(this.appid, this.apiKey, this.apiSecret, this.sparkUrl);
      const url = wsParam.createUrl();

      const ws = new WebSocket(url);
      let answer = '';
      let isFirstContent = true;

      ws.on('open', () => {
        const reqData = {
          header: {
            app_id: this.appid,
            uid: '1234',
          },
          parameter: {
            chat: {
              domain: this.domain,
              temperature: 0.3,
              max_tokens: 2048,
            },
          },
          payload: {
            message: {
              text: this.messageHistory,
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
            reject(new Error(`请求错误: ${data.header.code} ${data.header.message}`));
            return;
          }
          const choices = data.payload?.choices;
          if (!choices) return;

          const status = choices.status;
          const text = choices.text?.[0];
          if (!text) return;

          // 只输出最终回答，忽略 reasoning_content
          if (text.content) {
            if (isFirstContent) {
              isFirstContent = false;
            }
            process.stdout.write(text.content); // 可删除此行，避免在控制台输出
            answer += text.content;
          }

          if (status === 2) {
            ws.close();
            this.appendMessage('assistant', answer);
            resolve(answer);
          }
        } catch (e) {
          ws.close();
          reject(e);
        }
      });

      ws.on('error', (err) => {
        reject(err);
      });

      ws.on('close', () => {
        // 如果没resolve就关闭，reject
        // 这里不处理
      });
    });
  }
}

const appid = '2fb081ac';
const apiKey = 'a333dae3b265d577d4f2ac430e6ed782';
const apiSecret = 'YWRmODg3YzE1MDQ4YWRhMDkyNWNlYjll';
const client = new SparkAPI(appid, apiKey, apiSecret);

app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: '请求体必须包含字符串类型的question字段' });
  }

  try {
    const answer = await client.ask(question);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message || '调用AI服务失败' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务启动，监听端口 ${PORT}`);
  console.log(`POST http://localhost:${PORT}/api/chat  传入 { "question": "你的问题" }`);
});
