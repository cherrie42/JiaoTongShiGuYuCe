<template>
  <div class="accident-prediction">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="prediction-form">
          <template #header>
            <div class="card-header">
              <span>事故风险预测</span>
            </div>
          </template>

          <el-form :model="predictionForm" label-width="120px">
            <el-form-item label="地点">
              <el-input v-model="predictionForm.location" placeholder="输入地点" />
            </el-form-item>
            <el-form-item label="时间">
              <el-date-picker
                v-model="predictionForm.datetime"
                type="datetime"
                placeholder="选择日期时间"
              />
            </el-form-item>
            <el-form-item label="天气条件">
              <el-select v-model="predictionForm.weather" placeholder="选择天气条件">
                <el-option label="晴" value="sunny" />
                <el-option label="阴" value="cloudy" />
                <el-option label="雨" value="rainy" />
                <el-option label="雪" value="snowy" />
                <el-option label="雾" value="foggy" />
              </el-select>
            </el-form-item>
            <el-form-item label="道路状况">
              <el-select v-model="predictionForm.roadCondition" placeholder="选择道路状况">
                <el-option label="良好" value="good" />
                <el-option label="潮湿" value="wet" />
                <el-option label="结冰" value="icy" />
                <el-option label="积雪" value="snowy" />
                <el-option label="施工" value="construction" />
              </el-select>
            </el-form-item>
            <el-form-item label="交通流量">
              <el-select v-model="predictionForm.trafficFlow" placeholder="选择交通流量">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitPrediction" :loading="loading">
                开始预测
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card v-if="predictionResult" class="prediction-result">
          <template #header>
            <div class="card-header">
              <span>预测结果</span>
            </div>
          </template>

          <div class="result-content">
            <div class="risk-level">
              <div class="level-title">风险等级</div>
              <el-tag :type="getRiskLevelType(predictionResult.riskLevel)" size="large">
                {{ predictionResult.riskLevel }}
              </el-tag>
            </div>

            <div class="risk-factors">
              <div class="factors-title">主要风险因素</div>
              <el-timeline>
                <el-timeline-item
                  v-for="(factor, index) in predictionResult.riskFactors"
                  :key="index"
                  :type="getTimelineItemType(index)"
                >
                  {{ factor }}
                </el-timeline-item>
              </el-timeline>
            </div>

            <div class="suggestions">
              <div class="suggestions-title">安全建议</div>
              <el-collapse>
                <el-collapse-item
                  v-for="(suggestion, index) in predictionResult.suggestions"
                  :key="index"
                  :title="suggestion.title"
                >
                  {{ suggestion.content }}
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-card>

        <el-empty v-else description="暂无预测结果" />
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const predictionForm = ref({
  location: '',
  datetime: '',
  weather: '',
  roadCondition: '',
  trafficFlow: ''
})

const predictionResult = ref(null)

const submitPrediction = async () => {
  if (!validateForm()) {
    ElMessage.warning('请填写完整的预测信息')
    return
  }

  loading.value = true
  try {
    const response = await axios.post('/api/prediction', predictionForm.value)
    predictionResult.value = response.data
    ElMessage.success('预测完成')
  } catch (error) {
    ElMessage.error('预测失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const validateForm = () => {
  return Object.values(predictionForm.value).every(value => value !== '')
}

const getRiskLevelType = (level) => {
  const types = {
    '低风险': 'success',
    '中风险': 'warning',
    '高风险': 'danger'
  }
  return types[level] || 'info'
}

const getTimelineItemType = (index) => {
  const types = ['danger', 'warning', 'info']
  return types[index % types.length]
}
</script>

<style lang="scss" scoped>
.accident-prediction {
  .prediction-form {
    height: 100%;
  }

  .prediction-result {
    height: 100%;

    .result-content {
      .risk-level {
        text-align: center;
        margin-bottom: 30px;

        .level-title {
          font-size: 1.2em;
          margin-bottom: 10px;
          color: #606266;
        }

        .el-tag {
          font-size: 1.5em;
          padding: 10px 20px;
        }
      }

      .risk-factors,
      .suggestions {
        margin-top: 20px;

        .factors-title,
        .suggestions-title {
          font-size: 1.1em;
          margin-bottom: 15px;
          color: #606266;
        }
      }
    }
  }
}
</style>