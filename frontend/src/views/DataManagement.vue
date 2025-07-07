<template>
  <div class="data-management">
    <el-card class="operation-card">
      <template #header>
        <div class="card-header">
          <span>数据操作</span>
          <div class="header-buttons">
            <el-upload
              class="upload-demo"
              action="/api/data/import"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon>
                导入数据
              </el-button>
            </el-upload>
            <el-button type="success" @click="exportData">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </div>
        </div>
      </template>
    </el-card>

    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        border
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="date" label="事故日期" width="120" />
        <el-table-column prop="location" label="地点" width="180" />
        <el-table-column prop="weather" label="天气条件" width="120" />
        <el-table-column prop="roadCondition" label="道路状况" width="120" />
        <el-table-column prop="accidentType" label="事故类型" width="120" />
        <el-table-column prop="casualties" label="伤亡人数" width="100" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              size="small"
              @click="handleEdit(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑事故数据"
      width="50%"
    >
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="事故日期">
          <el-date-picker
            v-model="editForm.date"
            type="date"
            placeholder="选择日期"
          />
        </el-form-item>
        <el-form-item label="地点">
          <el-input v-model="editForm.location" />
        </el-form-item>
        <el-form-item label="天气条件">
          <el-select v-model="editForm.weather" placeholder="选择天气条件">
            <el-option label="晴" value="sunny" />
            <el-option label="阴" value="cloudy" />
            <el-option label="雨" value="rainy" />
            <el-option label="雪" value="snowy" />
            <el-option label="雾" value="foggy" />
          </el-select>
        </el-form-item>
        <el-form-item label="道路状况">
          <el-select v-model="editForm.roadCondition" placeholder="选择道路状况">
            <el-option label="良好" value="good" />
            <el-option label="潮湿" value="wet" />
            <el-option label="结冰" value="icy" />
            <el-option label="积雪" value="snowy" />
            <el-option label="施工" value="construction" />
          </el-select>
        </el-form-item>
        <el-form-item label="事故类型">
          <el-select v-model="editForm.accidentType" placeholder="选择事故类型">
            <el-option label="追尾" value="rear_end" />
            <el-option label="侧翻" value="rollover" />
            <el-option label="碰撞" value="collision" />
            <el-option label="刮蹭" value="scratch" />
          </el-select>
        </el-form-item>
        <el-form-item label="伤亡人数">
          <el-input-number v-model="editForm.casualties" :min="0" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Download } from '@element-plus/icons-vue'
import axios from 'axios'

// 表格数据
const tableData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 编辑表单数据
const dialogVisible = ref(false)
const editForm = ref({
  id: null,
  date: '',
  location: '',
  weather: '',
  roadCondition: '',
  accidentType: '',
  casualties: 0,
  description: ''
})

// 获取表格数据
const fetchData = async () => {
  loading.value = true
  try {
    const response = await axios.get('/api/accidents', {
      params: {
        page: currentPage.value - 1,
        size: pageSize.value
      }
    })
    tableData.value = response.data.content
    total.value = response.data.totalElements
  } catch (error) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 编辑操作
const handleEdit = (row) => {
  editForm.value = { ...row }
  dialogVisible.value = true
}

// 保存编辑
const handleSave = async () => {
  try {
    if (editForm.value.id) {
      await axios.put(`/api/accidents/${editForm.value.id}`, editForm.value)
    } else {
      await axios.post('/api/accidents', editForm.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 删除操作
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      type: 'warning'
    })
    await axios.delete(`/api/accidents/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 文件上传处理
const handleUploadSuccess = () => {
  ElMessage.success('数据导入成功')
  fetchData()
}

const handleUploadError = () => {
  ElMessage.error('数据导入失败')
}

// 数据导出
const exportData = async () => {
  try {
    const response = await axios.get('/api/accidents/export', {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '交通事故数据.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.data-management {
  .operation-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-buttons {
        display: flex;
        gap: 10px;
      }
    }
  }

  .table-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>