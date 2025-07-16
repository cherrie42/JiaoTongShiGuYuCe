<template>
  <div class="auth-wrapper">
    <img src="@/image/logo.png" alt="Logo" class="page-logo" />
    <div class="auth-card" :class="{ 'register-mode': mode === 'register' }">
      <div class="toggle-btns">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <transition name="fade-slide" mode="out-in">
        <el-form
          :key="mode"
          :model="form"
          :rules="getRules"
          ref="formRef"
          label-position="top"
          class="auth-form"
          @submit.prevent
        >
          <!-- 角色选择 -->
          <el-form-item label="角色" prop="role">
            <el-radio-group v-model="form.role">
              <el-radio label="user">普通用户</el-radio>
              <el-radio label="admin">管理员</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 超级管理员密码，仅在注册页面并且角色为管理员时显示 -->
          <el-form-item
            v-if="mode === 'register' && form.role === 'admin'"
            label="超级管理员密码"
            prop="superAdminPassword"
          >
            <el-input
              v-model="form.superAdminPassword"
              type="password"
              placeholder="请输入超级管理员密码"
              show-password
            />
          </el-form-item>

          <template v-if="mode === 'register'">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入用户名" />
            </el-form-item>
          </template>

          <el-form-item label="邮箱" prop="email">
            <template v-if="mode === 'register'">
              <el-input
                v-model="form.email"
                placeholder="请输入邮箱"
                style="width: calc(100% - 120px);"
              />
              <el-button
                :disabled="sendCodeLoading || countdown > 0"
                @click="sendCode"
                size="small"
                style="margin-left: 8px; width: 100px;"
              >
                <template v-if="countdown === 0">发送验证码</template>
                <template v-else>{{ countdown }} 秒后重发</template>
              </el-button>
            </template>
            <template v-else>
              <el-input v-model="form.email" placeholder="请输入邮箱" style="width: 100%;" />
            </template>
          </el-form-item>

          <template v-if="mode === 'register'">
            <el-form-item label="验证码" prop="code">
              <el-input v-model="form.code" placeholder="请输入验证码" />
            </el-form-item>
          </template>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
            />
          </el-form-item>

          <template v-if="mode === 'register'">
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="form.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                show-password
              />
            </el-form-item>
          </template>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              @click="submitForm"
              style="width: 100%"
            >
              {{ mode === 'login' ? '登录' : '注册' }}
            </el-button>
          </el-form-item>
        </el-form>
      </transition>

      <el-button type="text" class="enter-app-btn" @click="enterApp">
        直接进入系统 &raquo;
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { login, register, sendVerificationCode } from '@/api/user'

const mode = ref('login')
const loading = ref(false)
const sendCodeLoading = ref(false)
const countdown = ref(0)
let timer = null
const formRef = ref(null)

const form = ref({
  username: '',
  email: '',
  code: '',
  password: '',
  confirmPassword: '',
  role: 'user',
  superAdminPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator(rule, value, callback) {
        if (value !== form.value.password) {
          callback(new Error('两次密码输入不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  superAdminPassword: [
    {
      required: true,
      validator(rule, value, callback) {
        if (form.value.role === 'admin' && !value) {
          callback(new Error('请输入超级管理员密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const getRules = computed(() => {
  if (mode.value === 'login') {
    return {
      email: rules.email,
      password: rules.password,
      role: rules.role 
    }
  } else {
    return {
      username: rules.username,
      email: rules.email,
      code: rules.code,
      password: rules.password,
      confirmPassword: rules.confirmPassword,
      role: rules.role,
      ...(form.value.role === 'admin' && { superAdminPassword: rules.superAdminPassword })
    }
  }
})

const sendCode = async () => {
  if (!form.value.email) {
    ElMessage.warning('请先输入邮箱')
    return
  }
  sendCodeLoading.value = true
  try {
    await sendVerificationCode({ email: form.value.email })
    ElMessage.success('验证码发送成功，请注意查收邮箱')
    startCountdown()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '验证码发送失败')
  } finally {
    sendCodeLoading.value = false
  }
}

const startCountdown = () => {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      if (mode.value === 'login') {
 const res = await login({ email: form.value.email, password: form.value.password })

if (res.token && res.user) {
  const { token, user } = res

  // 存储 token 和 role
  localStorage.setItem('token', token)
  localStorage.setItem('role', user.role)
  localStorage.setItem('user', JSON.stringify(user))  // 建议也存完整用户信息

  ElMessage.success('登录成功！')
  router.push('/home')
} else {
  ElMessage.error('登录失败，接口返回结构不符合预期')
  console.warn('登录失败，返回内容：', res)
}

}
 else {
        await register({
          username: form.value.username,
          email: form.value.email,
          password: form.value.password,
          code: form.value.code,
          role: form.value.role,
          superAdminPassword: form.value.role === 'admin' ? form.value.superAdminPassword : undefined
        })
        ElMessage.success('注册成功！请登录')
        mode.value = 'login'
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '请求失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

const router = useRouter()
const enterApp = () => {
  router.push('/home')
}
</script>


<style scoped lang="scss">

.auth-wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

  //自定义图片背景
  background: url('@/image/traffic-backgroud.png') center center / cover no-repeat;

  position: relative;
  padding: 20px;

  // 添加一个遮罩层
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-color: rgba(33, 88, 170, 0.315);
    z-index: 1;
  }

  // 保证内容在遮罩上面
  .auth-card {
    position: relative;
    z-index: 2;
  }
}

.auth-card {
  background: #a899f583;
  border-radius: 16px;
  box-shadow: 0 20px 30px rgba(201, 205, 221, 0.4);
  padding: 40px 32px;
  width: 360px;
  transition: width 0.4s ease;

  &.register-mode {
    width: 420px;
  }
}

.page-logo {
  position: absolute;
  top: 40px;
  left: 20%;
  transform: translateX(-50%);
  z-index: 3;
  width: 250px;
  height: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  opacity: 0.7;
}

.toggle-btns {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;

  button {
    flex: 1;
    padding: 12px 0;
    border: none;
    background: transparent;
    font-weight: 700;
    font-size: 28px;
    color: #a9d4db;
    cursor: pointer;
    transition: color 0.3s, border-bottom 0.3s;

    &.active {
      color: #7efff9;
      border-bottom: 3px solid #667eea;
    }

    &:hover:not(.active) {
      color: #a0a0a0;
    }
  }
}

.auth-form {
  ::v-deep(.el-form-item__label) {
    font-weight: 600;
    color: #ffffff !important;
    font-size: 18px;
    margin-bottom: 6px;
    display: block;
    transition: color 0.3s;
  }

  ::v-deep(.el-input__inner) {
    border-radius: 8px;
    border: 1.5px solid #ffffff;
    font-size: 16px;
    padding: 10px 14px;
    transition: border-color 0.3s, box-shadow 0.3s;

    &:focus,
    &:hover {
      border-color: #ffffff;
      box-shadow: 0 0 8px rgba(230, 231, 233, 0.6);
    }
  }

  .el-button {
    border-radius: 10px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1.2px;
  }
}

/* 动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.enter-app-btn {
  margin-top: 16px;
  display: block;
  width: 100%;
  font-size: 16px;
  color: #a6c0e3;
  text-align: center;
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
    color: #7efff9;
  }
}
</style>
