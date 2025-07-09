import sys
import json
import random

def predict_risk(path):
    # 简单根据路径长度估算风险
    return min(10, len(path) * 0.05 + random.uniform(0, 1))

if __name__ == "__main__":
    data = json.load(sys.stdin)
    path = data.get("path", [])
    risk = predict_risk(path)
    print(risk)
