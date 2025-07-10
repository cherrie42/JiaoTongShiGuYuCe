// routes/accidentRoutes.js
const express = require('express');
const router = express.Router();
const Accident = require('../models/Accident'); // 修改这一行

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
      content: rows, // 将 result.rows 改为 rows
      totalElements: count, // 将 result.count 改为 count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '查询失败', details: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newAccident = await Accident.create(req.body);
    res.json(newAccident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '新增失败', details: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Accident.update(req.body, { where: { id } });
    const updated = await Accident.findByPk(id);
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新失败', details: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Accident.destroy({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '删除失败', details: error.message });
  }
});

module.exports = router;
