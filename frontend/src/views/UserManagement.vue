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
        <el-table-column prop="role" label="角色" width="100" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column prop="updated_at" label="更新时间" width="180" />
        <el-table-column label="操作" width="200">
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
        <el-form-item label="角色">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="用户" value="user" />
          </el-select>
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
import { ref, reactive, onMounted } from 'vue'
import { UserFilled, Message } from '@element-plus/icons-vue'
import axios from 'axios'
import { getUserList, createUser, updateUser, deleteUserById } from '@/api/user'

const users = ref([])

const fetchUsers = async () => {
  try {
    const res = await getUserList()
    users.value = Array.isArray(res) ? res : res.data || []
  } catch (err) {
    console.error('获取用户数据失败：', err)
  }
}

onMounted(() => {
  fetchUsers()
})

const feedbackList = ref([
  { id: 1, username: 'user1', content: '系统很好用！', date: '2025-07-11 10:30' },
  { id: 2, username: 'user2', content: '希望增加夜间模式功能', date: '2025-07-10 21:00' }
])

const dialogVisible = ref(false)
const dialogTitle = ref('')
const form = reactive({
  id: null,
  username: '',
  email: '',
  role: ''
})

function addUser() {
  dialogTitle.value = '新增用户'
  Object.assign(form, {
    id: null,
    username: '',
    email: '',
    role: '',
    password: ''
  })
  dialogVisible.value = true
}

function editUser(user) {
  dialogTitle.value = '编辑用户'
  Object.assign(form, user)
  dialogVisible.value = true
}

async function saveUser() {
  if (!form.username || !form.email || !form.role) {
    alert('请填写完整信息')
    return
  }
  try {
    if (form.id === null) {
      await createUser(form)
    } else {
      await updateUser(form)
    }
    dialogVisible.value = false
    fetchUsers()
  } catch (err) {
    console.error('保存用户失败：', err)
  }
}

async function deleteUser(user) {
  if (confirm(`确认删除用户 ${user.username} 吗？`)) {
    try {
      await deleteUserById(user.id)
      fetchUsers()
    } catch (err) {
      console.error('删除用户失败：', err)
    }
  }
}

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

::v-deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
}
</style>
