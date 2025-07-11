<template>
    <div class="user-management">
      <el-card>
        <h2>用户管理</h2>
  
        <!-- 简单的用户列表示例 -->
        <el-table :data="users" style="width: 100%">
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
  
        <!-- 新增用户按钮 -->
        <el-button type="success" style="margin-top: 15px;" @click="addUser">新增用户</el-button>
  
        <!-- 新增/编辑用户弹窗 -->
        <el-dialog :title="dialogTitle" :visible.sync="dialogVisible">
          <el-form :model="form">
            <el-form-item label="用户名" :label-width="formLabelWidth">
              <el-input v-model="form.username" autocomplete="off" />
            </el-form-item>
            <el-form-item label="邮箱" :label-width="formLabelWidth">
              <el-input v-model="form.email" autocomplete="off" />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveUser">保存</el-button>
          </template>
        </el-dialog>
      </el-card>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive } from 'vue'
  
  const users = ref([
    { id: 1, username: 'user1', email: 'user1@example.com' },
    { id: 2, username: 'user2', email: 'user2@example.com' },
  ])
  
  const dialogVisible = ref(false)
  const dialogTitle = ref('')
  
  const formLabelWidth = '80px'
  
  const form = reactive({
    id: null,
    username: '',
    email: ''
  })
  
  function addUser() {
    dialogTitle.value = '新增用户'
    form.id = null
    form.username = ''
    form.email = ''
    dialogVisible.value = true
  }
  
  function editUser(user) {
    dialogTitle.value = '编辑用户'
    form.id = user.id
    form.username = user.username
    form.email = user.email
    dialogVisible.value = true
  }
  
  function saveUser() {
    if (!form.username || !form.email) {
      alert('用户名和邮箱不能为空')
      return
    }
    if (form.id === null) {
      // 新增
      users.value.push({
        id: users.value.length + 1,
        username: form.username,
        email: form.email
      })
    } else {
      // 编辑
      const index = users.value.findIndex(u => u.id === form.id)
      if (index !== -1) {
        users.value[index].username = form.username
        users.value[index].email = form.email
      }
    }
    dialogVisible.value = false
  }
  
  function deleteUser(user) {
    const index = users.value.findIndex(u => u.id === user.id)
    if (index !== -1 && confirm(`确认删除用户 ${user.username} 吗？`)) {
      users.value.splice(index, 1)
    }
  }
  </script>
  
  <style scoped>
  .user-management {
    padding: 20px;
  }
  </style>
  