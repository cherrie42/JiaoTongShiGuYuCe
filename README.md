# 交通事故预测系统（JiaoTongShiGuYuCe）

## 项目简介
本项目是一个基于机器学习和高德地图的交通事故预测与路线风险分析平台，支持路线规划、事故风险预测、数据管理、AI智能助手等功能，适用于交通安全分析、智能出行辅助等场景。

## 主要功能
- 路线规划与多策略推荐
- 路线风险分析与可视化
- 交通事故风险预测
- 历史事故数据管理与分析
- 用户注册/登录/管理
- AI 智能助手（问答聊天）

## 项目结构
```
JiaoTongShiGuYuCe/
├── backend/           # 后端 Node.js 服务
│   ├── AI/            # AI 聊天相关模块
│   ├── accident-management/ # 事故管理子模块
│   ├── controllers/   # 控制器
│   ├── data/          # 数据文件
│   ├── model/         # 机器学习模型与训练
│   ├── routes/        # 路由
│   ├── services/      # 业务服务
│   ├── test/          # 测试脚本
│   ├── utils/         # 工具函数
│   ├── index.js       # 后端主入口
│   └── ...
├── frontend/          # 前端 Vue3 + Vite 项目
│   ├── src/
│   │   ├── api/       # 前端接口
│   │   ├── views/     # 页面组件
│   │   ├── router/    # 路由
│   │   └── ...
│   ├── index.html
│   └── ...
└── README.md
```

## 环境依赖
- Node.js >= 16.x
- npm >= 8.x
- Python >= 3.8（如需模型训练）
- 依赖包见各自 package.json/requirements.txt

## 安装依赖
### 后端依赖
```bash
cd backend
npm install
```

### 前端依赖
```bash
cd frontend
npm install
```

### AI模块依赖（如有）
```bash
cd backend/AI
npm install
```

## 启动指令
### 启动后端服务（默认端口3001）
```bash
cd backend
npm start
```

### 启动前端服务（默认端口3000）
```bash
cd frontend
npm run dev
```

### 启动AI聊天模块（如监听4000端口）
```bash
cd backend/AI
node spark-ws-client.js  # 或 node testclient.js
```

> 若AI聊天端口有变，请同步修改前端 `src/views/AiChat.vue` 里的请求地址。

## 模型训练与测试
### 训练模型
```bash
cd backend/model
python model.py  # 或 python trainModel.py
```

### 测试模型
```bash
cd backend/model
python model.py  # 或使用 testAPI.js 进行接口测试
```

## 其他说明
- 前后端接口通过 Vite 代理 `/api` 实现联调，具体见 `frontend/vite.config.js`。
- 事故数据样例见 `backend/data/traffic_accidents_sample.xlsx`。
- 邮件验证码、AI 聊天等功能需配置相关第三方服务。
- 如需部署生产环境，请根据实际情况调整端口、数据库、环境变量等配置。

---
如有问题欢迎提 issue 或联系开发者。 
