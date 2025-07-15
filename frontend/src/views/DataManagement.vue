<template>
  <div class="data-management">
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        border
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="accident_points" label="地点" width="120" />
        <el-table-column prop="crash_date" label="事故日期" width="180" />
        <el-table-column prop="traffic_control_device" label="交通控制设备" width="150" />
        <el-table-column prop="weather_condition" label="天气状况" width="120" />
        <el-table-column prop="lighting_condition" label="照明状况" width="150" />
        <el-table-column prop="trafficway_type" label="道路类型" width="180" />
        <el-table-column prop="alignment" label="道路形态" width="150" />
        <el-table-column prop="roadway_surface_cond" label="路面状况" width="120" />
        <el-table-column prop="road_defect" label="道路缺陷" width="120" />
        <el-table-column prop="intersection_related_i" label="是否路口相关" width="120" />
        <el-table-column prop="crash_hour" label="事故小时" width="100" />
        <el-table-column prop="crash_day_of_week" label="星期几" width="100" />
        <el-table-column prop="crash_month" label="月份" width="100" />
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

    <el-dialog
      v-model="dialogVisible"
      title="编辑事故数据"
      width="60%"
    >
      <el-form :model="editForm" label-width="140px">
        <el-form-item label="地点">
          <el-input v-model="editForm.accident_points" />
        </el-form-item>
        <el-form-item label="事故日期">
          <el-date-picker
            v-model="editForm.crash_date"
            type="datetime"
            placeholder="选择日期和时间"
            format="MM/dd/yyyy hh:mm:ss a"
            value-format="MM/dd/yyyy hh:mm:ss a"
          />
        </el-form-item>
        <el-form-item label="交通控制设备">
          <el-input v-model="editForm.traffic_control_device" />
        </el-form-item>
        <el-form-item label="天气状况">
          <el-select v-model="editForm.weather_condition" placeholder="选择天气状况">
            <el-option label="晴" value="SUN" />
            <el-option label="阴" value="CLOUDY" />
            <el-option label="雨" value="RAIN" />
            <el-option label="雪" value="SNOW" />
            <el-option label="雾" value="FOG" />
          </el-select>
        </el-form-item>
        <el-form-item label="照明状况">
          <el-input v-model="editForm.lighting_condition" />
        </el-form-item>
        <el-form-item label="道路类型">
          <el-input v-model="editForm.trafficway_type" />
        </el-form-item>
        <el-form-item label="道路形态">
          <el-input v-model="editForm.alignment" />
        </el-form-item>
        <el-form-item label="路面状况">
          <el-input v-model="editForm.roadway_surface_cond" />
        </el-form-item>
        <el-form-item label="道路缺陷">
          <el-input v-model="editForm.road_defect" />
        </el-form-item>
        <el-form-item label="是否路口相关">
          <el-select v-model="editForm.intersection_related_i" placeholder="选择">
            <el-option label="是" value="Y" />
            <el-option label="否" value="N" />
          </el-select>
        </el-form-item>
        <el-form-item label="事故小时">
          <el-input-number v-model="editForm.crash_hour" :min="0" :max="23" />
        </el-form-item>
        <el-form-item label="星期几">
          <el-input-number v-model="editForm.crash_day_of_week" :min="1" :max="7" />
        </el-form-item>
        <el-form-item label="月份">
          <el-input-number v-model="editForm.crash_month" :min="1" :max="12" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAccidents, createAccident, updateAccident, deleteAccident } from '@/api/data'


const tableData = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const dialogVisible = ref(false)
const editForm = ref({})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getAccidents({
      page: currentPage.value - 1,
      size: pageSize.value
    })
    console.log('接口返回数据:', res)  // 调试输出，确认结构
    tableData.value = res.content
    total.value = res.totalElements
  } catch (error) {
    console.error('请求失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}



const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

const handleEdit = (row) => {
  editForm.value = { ...row }
  dialogVisible.value = true
}

const handleSave = async () => {
  try {
    if (editForm.value.id) {
      await updateAccident(editForm.value.id, editForm.value)
    } else {
      await createAccident(editForm.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}


const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      type: 'warning'
    })
    await deleteAccident(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}


onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
