<template>
    <div class="user-management">
      <!-- 用户管理卡片 -->
      <el-card class="frosted-card">
        <div class="card-header">
          <el-icon><UserFilled /></el-icon>
          <h2>用户管理</h2>
        </div>
  
        <el-table :data="users" stripe border class="custom-table">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button type="primary" size="small" @click="editUser(scope.row)">编辑</el-button>
              <el-button type="danger" size="small" @click="deleteUser(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
  
        <div class="action-btn">
          <el-button type="success" @click="addUser">新增用户</el-button>
        </div>
      </el-card>
  
      <!-- 用户反馈卡片 -->
      <el-card class="frosted-card">
        <div class="card-header">
          <el-icon><Message /></el-icon>
          <h2>用户反馈列表</h2>
        </div>
  
        <el-table :data="feedbackList" stripe border class="custom-table">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="content" label="反馈内容" />
          <el-table-column prop="date" label="提交时间" width="180" />
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button type="danger" size="small" @click="deleteFeedback(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
  
      <!-- 弹窗 -->
      <el-dialog :title="dialogTitle" v-model="dialogVisible" width="400px" class="frosted-dialog">
        <el-form :model="form" label-width="80px">
          <el-form-item label="用户名">
            <el-input v-model="form.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveUser">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive } from 'vue'
  import { UserFilled, Message } from '@element-plus/icons-vue'
  
  // 用户数据
  const users = ref([
    { id: 1, username: 'user1', email: 'user1@example.com' },
    { id: 2, username: 'user2', email: 'user2@example.com' }
  ])
  
  // 反馈数据
  const feedbackList = ref([
    { id: 1, username: 'user1', content: '系统很好用！', date: '2025-07-11 10:30' },
    { id: 2, username: 'user2', content: '希望增加夜间模式功能', date: '2025-07-10 21:00' }
  ])
  
  const dialogVisible = ref(false)
  const dialogTitle = ref('')
  const form = reactive({
    id: null,
    username: '',
    email: ''
  })
  
  // 新增
  function addUser() {
    dialogTitle.value = '新增用户'
    form.id = null
    form.username = ''
    form.email = ''
    dialogVisible.value = true
  }
  
  // 编辑
  function editUser(user) {
    dialogTitle.value = '编辑用户'
    form.id = user.id
    form.username = user.username
    form.email = user.email
    dialogVisible.value = true
  }
  
  // 保存
  function saveUser() {
    if (!form.username || !form.email) {
      alert('用户名和邮箱不能为空')
      return
    }
    if (form.id === null) {
      users.value.push({
        id: users.value.length + 1,
        username: form.username,
        email: form.email
      })
    } else {
      const index = users.value.findIndex(u => u.id === form.id)
      if (index !== -1) {
        users.value[index].username = form.username
        users.value[index].email = form.email
      }
    }
    dialogVisible.value = false
  }
  
  // 删除用户
  function deleteUser(user) {
    const index = users.value.findIndex(u => u.id === user.id)
    if (index !== -1 && confirm(`确认删除用户 ${user.username} 吗？`)) {
      users.value.splice(index, 1)
    }
  }
  
  // 删除反馈
  function deleteFeedback(row) {
    const index = feedbackList.value.findIndex(f => f.id === row.id)
    if (index !== -1 && confirm(`确认删除反馈内容 "${row.content}" 吗？`)) {
      feedbackList.value.splice(index, 1)
    }
  }
  </script>
  
  <style scoped>
  .user-management {
    padding: 24px;
    min-height: 100vh;
    background: linear-gradient(to bottom right, #e3f2fd, #f5faff);
  }
  
  /* 毛玻璃卡片样式 */
  .frosted-card {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    padding: 20px;
    margin-bottom: 30px;
    transition: transform 0.3s ease;
  }
  .frosted-card:hover {
    transform: translateY(-4px);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }
  .card-header h2 {
    font-size: 20px;
    color: #409eff;
    margin: 0;
  }
  .card-header svg {
    color: #409eff;
  }
  
  .custom-table {
    background-color: transparent;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .action-btn {
    margin-top: 15px;
    text-align: right;
  }
  
  /* 可选：对话框毛玻璃效果 */
  ::v-deep(.el-dialog) {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 16px;
  }
  </style>
  