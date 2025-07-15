const express = require('express');
const router = express.Router();
const Accident = require('../models/Accident'); // 请确保路径正确

// 分页获取事故列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 10;

    const { count, rows } = await Accident.findAndCountAll({
      offset: page * size,
      limit: size,
      order: [['crash_date', 'DESC']],
    });

    res.json({
      code: 200,
      message: '成功',
      data: {
        content: rows,
        totalElements: count
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: 500,
      message: '查询失败',
      error: error.message
    });
  }
});

// 新增事故记录
router.post('/', async (req, res) => {
  try {
    const newAccident = await Accident.create(req.body);
    res.json({
      code: 200,
      message: '新增成功',
      data: newAccident
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: 500,
      message: '新增失败',
      error: error.message
    });
  }
});

// 更新事故记录
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Accident.update(req.body, { where: { id } });
    const updated = await Accident.findByPk(id);

    res.json({
      code: 200,
      message: '更新成功',
      data: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: 500,
      message: '更新失败',
      error: error.message
    });
  }
});

// 删除事故记录
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Accident.destroy({ where: { id } });
    res.json({
      code: 200,
      message: '删除成功',
      data: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: 500,
      message: '删除失败',
      error: error.message
    });
  }
});

module.exports = router;
