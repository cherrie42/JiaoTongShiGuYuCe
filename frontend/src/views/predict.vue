<!-- src/views/AccidentPrediction.vue -->
<template>
  <div class="p-4">
    <el-card>
      <h2 class="text-xl font-bold mb-4">交通事故预测</h2>
      <el-form :model="form" label-width="120px">
        <el-form-item label="地点">
          <el-input v-model="form.location" placeholder="输入或选择地点" />
        </el-form-item>
        <el-form-item label="天气">
          <el-select v-model="form.weather" placeholder="请选择天气">
            <el-option label="晴" value="sunny" />
            <el-option label="雨" value="rainy" />
            <el-option label="雪" value="snowy" />
            <el-option label="雾" value="foggy" />
          </el-select>
        </el-form-item>
        <el-form-item label="光照">
          <el-select v-model="form.light" placeholder="请选择光照">
            <el-option label="白天" value="day" />
            <el-option label="夜间" value="night" />
          </el-select>
        </el-form-item>
        <el-form-item label="路面湿滑">
          <el-switch v-model="form.slippery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submit">提交预测</el-button>
        </el-form-item>
      </el-form>
      <el-divider />
      <div v-if="prediction">
        <h3>预测结果：</h3>
        <p>事故风险等级：<strong>{{ prediction.risk_level }}</strong></p>
        <p>预测详情：{{ prediction.description }}</p>
      </div>
    </el-card>
  </div>
</template>

<script>
import axios from 'axios';
export default {
  name: 'AccidentPrediction',
  data() {
    return {
      form: {
        location: '',
        weather: '',
        light: '',
        slippery: false,
      },
      prediction: null,
    };
  },
  methods: {
    async submit() {
      try {
        const res = await axios.post('/api/predict', this.form);
        this.prediction = res.data;
      } catch (err) {
        this.$message.error('预测失败');
        console.error(err);
      }
    },
  },
};
</script>

<style scoped>
.el-card {
  max-width: 600px;
  margin: auto;
}
</style>
