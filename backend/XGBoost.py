import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import holidays
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import DMatrix, train as xgb_train
import warnings
warnings.filterwarnings("ignore")

# 1. 读取数据
df = pd.read_excel("backend/data/dataset2.xlsx")

# 2. 时间字段处理
df['crash_date'] = pd.to_datetime(df['crash_date'], errors='coerce')
df['year'] = df['crash_date'].dt.year
df['day'] = df['crash_date'].dt.day

# 3. 构造扩展特征
df['is_weekend'] = df['crash_day_of_week'].isin([5, 6]).astype(int)
df['is_peak_hour'] = df['crash_hour'].between(7, 9) | df['crash_hour'].between(16, 18)
df['is_peak_hour'] = df['is_peak_hour'].astype(int)
df['is_night'] = df['crash_hour'].apply(lambda h: 1 if h >= 20 or h <= 6 else 0)

def get_season(month):
    if month in [12, 1, 2]:
        return 'winter'
    elif month in [3, 4, 5]:
        return 'spring'
    elif month in [6, 7, 8]:
        return 'summer'
    else:
        return 'autumn'
df['season'] = df['crash_month'].apply(get_season)

bad_weather_keywords = ['RAIN', 'SNOW', 'FOG', 'STORM', 'FREEZING']
df['is_bad_weather'] = df['weather_condition'].astype(str).str.upper().apply(
    lambda x: 1 if any(word in x for word in bad_weather_keywords) else 0
)

us_holidays = holidays.US(years=range(df['year'].min(), df['year'].max() + 1))
df['is_holiday'] = df['crash_date'].dt.date.isin(us_holidays).astype(int)

df['day_type'] = 'workday'
df.loc[df['is_weekend'] == 1, 'day_type'] = 'weekend'
df.loc[df['is_holiday'] == 1, 'day_type'] = 'holiday'

holiday_dates = sorted(list(us_holidays.keys()))
def days_to_nearest_holiday(date):
    return min(abs((date - h).days) for h in holiday_dates)
df['days_to_holiday'] = df['crash_date'].dt.date.apply(days_to_nearest_holiday)

# 4. Label Encoding 类别特征
categorical_cols = [
    'traffic_control_device', 'weather_condition', 'lighting_condition',
    'first_crash_type', 'trafficway_type', 'alignment',
    'roadway_surface_cond', 'road_defect', 'intersection_related_i',
    'season', 'day_type'
]
for col in categorical_cols:
    df[col] = df[col].astype(str)
    df[col] = LabelEncoder().fit_transform(df[col])

feature_cols = [
    'crash_hour', 'crash_day_of_week', 'crash_month', 'day', 'year',
    'is_weekend', 'is_peak_hour', 'is_night', 'is_bad_weather',
    'is_holiday', 'days_to_holiday'
] + categorical_cols

X = df[feature_cols]
y = np.log1p(df['accident_points'])

# 5. 训练测试集划分
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 6. 转为 xgboost DMatrix 格式
dtrain = DMatrix(X_train, label=y_train)
dtest = DMatrix(X_test, label=y_test)

params = {
    'objective': 'reg:squarederror',
    'eval_metric': 'rmse',
    'learning_rate': 0.05,
    'max_depth': 7,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'reg_alpha': 2,
    'reg_lambda': 2,
    'seed': 42,
    'verbosity': 1
}

evals = [(dtrain, 'train'), (dtest, 'eval')]

# 7. 训练模型（无 early stopping）
bst = xgb_train(
    params,
    dtrain,
    num_boost_round=1000,
    evals=evals,
    verbose_eval=20
)

# 8. 预测与评估
y_pred_log = bst.predict(dtest)
y_pred = np.expm1(y_pred_log)
y_true = np.expm1(y_test)

rmse = np.sqrt(mean_squared_error(y_true, y_pred))
r2 = r2_score(y_true, y_pred)
print(f"\n测试集 RMSE: {rmse:.4f}")
print(f"R² Score: {r2:.4f}")

# 9. 特征重要性绘图
xgb.plot_importance(bst, max_num_features=20, height=0.8)
plt.title('Feature importance')
plt.show()

# 10. 示例预测
example = X.iloc[0:1]
example_dm = DMatrix(example)
pred_log = bst.predict(example_dm)
pred = np.expm1(pred_log)[0]
print(f"\n示例样本预测事故得分为：{pred:.2f}")
