# 交通事故预测系统

## 项目简介
本项目是一个基于 Node.js + Vue3 + TensorFlow.js 的交通事故风险预测系统，支持数据管理、模型训练、事故风险预测等功能。后端已弃用 tfjs-node，完全基于纯 JS 版本 tfjs，跨平台兼容性更好。

---

## 主要功能
- 交通事故数据管理与分析
- 交通事故风险预测（支持批量与单条预测）
- 支持自定义模型训练，自动划分训练集/测试集
- 前后端分离，API接口清晰
- 支持自动参数调整（EarlyStopping、ReduceLROnPlateau）

---

## 目录结构
```
JiaoTongShiGuYuCe/
├── backend/                    # Node.js + tfjs 后端服务
│   ├── controllers/            # 控制器层
│   │   ├── predictController.js    # 预测控制器
│   │   └── weatherController.js    # 天气控制器
│   ├── routes/                 # 路由层
│   │   ├── predict.js          # 预测相关路由
│   │   ├── roadInfo.js         # 道路信息路由
│   │   ├── structure.js        # 结构相关路由
│   │   └── weather.js          # 天气相关路由
│   ├── services/               # 服务层
│   ├── utils/                  # 工具函数
│   ├── model/                  # 模型相关
│   ├── data/                   # 数据文件
│   ├── trained_model/          # 训练好的模型存储
│   ├── aiModel.js              # AI模型核心类
│   ├── trainModel.js           # 模型训练脚本
│   ├── testAPI.js              # API测试脚本
│   ├── index.js                # 主入口文件
│   ├── app.js                  # Express应用配置
│   ├── dbConfig.js             # 数据库配置
│   └── package.json            # 后端依赖配置
├── frontend/                   # Vue3 前端页面
│   ├── src/
│   │   ├── views/              # 页面组件
│   │   │   ├── Home.vue            # 首页
│   │   │   ├── Dashboard.vue       # 仪表板
│   │   │   ├── DataManagement.vue  # 数据管理
│   │   │   ├── DataAnalysis.vue    # 数据分析
│   │   │   ├── AccidentPrediction.vue  # 事故预测
│   │   │   ├── RoutePlanning.vue   # 路线规划
│   │   │   └── LoginRegister.vue   # 登录注册
│   │   ├── api/                # API接口
│   │   ├── router/             # 路由配置
│   │   ├── utils/              # 工具函数
│   │   ├── App.vue             # 根组件
│   │   └── main.js             # 入口文件
│   ├── index.html              # HTML模板
│   ├── vite.config.js          # Vite配置
│   └── package.json            # 前端依赖配置
├── .gitignore                  # Git忽略文件
├── package.json                # 根目录依赖配置
└── README.md                   # 项目说明文档
```

---

## 环境依赖
- Node.js >= 16.x
- npm >= 8.x
- MySQL 数据库

---

## 安装依赖
### 后端
```bash
cd backend
npm install
```

### 前端
```bash
cd frontend
npm install
```

---

## 启动项目
### 启动后端
```bash
cd backend
node index.js
```
默认监听 3001 端口。

### 启动前端
```bash
cd frontend
npm run dev
```
默认监听 3000 端口。

---

## 模型训练与测试
### 训练模型
```bash
cd backend
node trainModel.js --db 5000   # 从数据库随机抽取5000条数据训练
```
- 支持自定义数据量，自动8:2划分训练集/测试集。
- 训练过程自动输出标签分布、训练进度、测试集评估等。

### 批量预测测试
```bash
cd backend
node testAPI.js
```
- 可模拟多组未知数据，查看模型预测效果。

---

## 常见问题
- **node_modules 不要提交到 git 仓库**，已通过 .gitignore 忽略。
- 后端已弃用 tfjs-node，兼容性更好但训练速度略慢。
- 如需更高性能，可考虑 Python 端模型或云端部署。

---

## 贡献与交流
如有建议、Bug 或合作意向，欢迎提 Issue 或 PR！

---

## License
MIT 
