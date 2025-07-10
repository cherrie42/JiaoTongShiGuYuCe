// models/Accident.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Accident = sequelize.define('traffic_accidents', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  accident_points: DataTypes.STRING,
  crash_date: DataTypes.STRING,
  traffic_control_device: DataTypes.STRING,
  weather_condition: DataTypes.STRING,
  lighting_condition: DataTypes.STRING,
  trafficway_type: DataTypes.STRING,
  alignment: DataTypes.STRING,
  roadway_surface_cond: DataTypes.STRING,
  road_defect: DataTypes.STRING,
  intersection_related_i: DataTypes.STRING,
  crash_hour: DataTypes.STRING,
  crash_day_of_week: DataTypes.STRING,
  crash_month: DataTypes.STRING,
}, {
  timestamps: false,
  freezeTableName: true,
});

module.exports = Accident;
