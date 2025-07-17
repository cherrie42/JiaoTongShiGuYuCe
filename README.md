# 交通事故预测系统（JiaoTongShiGuYuCe）

## 项目简介
本项目是一个基于机器学习与深度学习的交通事故预测与路线风险分析平台，集成了高德地图可视化、AI智能助手、历史数据管理、用户系统等功能，适用于交通安全分析、智能出行辅助等场景。

## 主要功能
- 路线规划与多策略推荐（高德地图可视化）
- 路线风险分析与分级（高/中/低风险自动判别，阈值可统一配置）
- 交通事故风险预测（多输出神经网络模型，预测事故概率与碰撞类型）
- 历史事故数据管理与分析
- 用户注册/登录/管理
- AI 智能助手（问答聊天）
- 邮件验证码、天气服务等扩展

## 项目结构
```
JiaoTongShiGuYuCe/
├── backend/                # 后端 Node.js 服务
│   ├── AI/                 # AI 聊天相关模块
│   ├── accident-management/ # 事故管理子模块
│   │   ├── models/         # 事故数据模型
│   │   ├── routes/         # 事故相关API
│   │   └── ...
│   ├── model/              # 机器学习模型与训练（aiModel.js, trainModel.js等）
│   ├── routes/             # 主要API路由（auth, predict, user, weather等）
│   ├── services/           # 业务服务（如核心预测服务）
│   ├── middleware/         # 中间件（如鉴权）
│   ├── utils/              # 工具函数（如邮件、验证码）
│   ├── trained_model/      # 训练好的模型及参数
│   ├── db.js, dbConfig.js  # 数据库配置
│   ├── index.js            # 后端主入口
│   └── ...
├── frontend/               # 前端 Vue3 + Vite 项目
│   ├── src/
│   │   ├── api/            # 前端接口封装
│   │   ├── views/          # 页面组件（如事故预测、数据分析、AI助手等）
│   │   ├── router/         # 路由
│   │   ├── utils/          # 工具
│   │   ├── styles/         # 样式
│   │   ├── image/          # 图片资源
│   │   └── ...
│   ├── index.html
│   └── ...
└── README.md
```

## 环境依赖
- Node.js >= 16.x
- npm >= 8.x
- Python >= 3.8（如需用Python训练模型）
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
node trainModel.js --db 5000
```
- 支持多输出神经网络（事故概率+碰撞类型）
- db之后的5000表示使用五千条数据进行训练，可根据需求更改，经过测试使用数据库中全部数据（共209306）训练效果更佳
- 训练数据自动标准化（Z-score归一化）
- 支持从数据库或Excel导入数据
- 训练日志会分别显示两个输出的损失和准确率

### 预测接口
- `/api/predict` 支持单条数据预测，返回事故概率、碰撞类型及风险等级
- 风险等级分级阈值统一由后端常量控制，前端自动适配

## 其他说明
- 前后端接口通过 Vite 代理 `/api` 实现联调，具体见 `frontend/vite.config.js`
- 事故数据样例见 `backend/data/traffic_accidents_sample.xlsx`
- 邮件验证码、AI 聊天等功能需配置相关第三方服务
- 如需部署生产环境，请根据实际情况调整端口、数据库、环境变量等配置

---
如有问题欢迎提 issue 或联系开发者。 
