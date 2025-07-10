<template>
  <div class="auth-wrapper">
    <!-- ✅ 添加 Logo 图片 -->
  <img src="@/image/logo.png" alt="Logo" class="page-logo" />

    <div class="auth-card" :class="{ 'register-mode': mode === 'register' }">
      <div class="toggle-btns">
        <button
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'"
          aria-label="登录"
        >
        
          登录
        </button>
        <button
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'"
          aria-label="注册"
        >
          注册
        </button>
      </div>

      <transition name="fade-slide" mode="out-in">
        <el-form
          :key="mode"
          :model="form"
          :rules="rules"
          ref="formRef"
          label-position="top"
          class="auth-form"
          @submit.prevent
        >
          <template v-if="mode === 'register'">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入用户名" />
            </el-form-item>
          </template>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>

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

      <el-button
        type="text"
        class="enter-app-btn"
        @click="enterApp"
      >
        直接进入系统 &raquo;
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const mode = ref('login') // login or register
const loading = ref(false)

const formRef = ref(null)

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    {
      type: 'email',
      message: '请输入正确的邮箱地址',
      trigger: ['blur', 'change']
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value) => {
        if (value !== form.value.password) {
          return new Error('两次密码输入不一致')
        }
      },
      trigger: 'blur'
    }
  ]
}

const submitForm = () => {
  formRef.value.validate((valid) => {
    if (!valid) return

    loading.value = true
    setTimeout(() => {
      loading.value = false
      if (mode.value === 'login') {
        ElMessage.success('登录成功！')
        // TODO: 登录逻辑
      } else {
        ElMessage.success('注册成功！')
        // TODO: 注册逻辑
      }
    }, 1200)
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
    background-color: rgba(33, 88, 170, 0.315); // 黑色半透明遮罩，可调节透明度
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
  top: 40px;       // 调整 logo 的顶部距离
  left: 20%;
  transform: translateX(-50%);
  z-index: 3;      // 确保在遮罩层之上
  width: 250px;    // 可根据需要调整大小
  height: auto;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); // 可选：加阴影更清晰
  opacity: 0.7;  // 设置透明度
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
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 直接进入系统 按钮样式 */
.enter-app-btn {
  display: block;
  margin: 12px auto 0;
  color: #eaebf0;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.3s;
  font-size: 16px;

  &:hover {
    color: #4056b2;
  }
}
</style>
