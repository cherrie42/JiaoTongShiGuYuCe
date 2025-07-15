@echo off
echo 正在安装依赖项...

echo.
echo --- 安装主后端服务依赖 (index.js) ---
pushd "%~dp0"
call npm install
popd

echo.
echo --- 安装AI服务依赖 (spark-ws-client.js) ---
pushd "%~dp0AI\"
call npm install
popd

echo.
echo --- 安装事故管理服务依赖 (app.js) ---
pushd "%~dp0accident-management\"
call npm install
popd

echo.
echo 所有依赖项安装完成。
echo 正在启动服务...

echo 正在启动主后端服务 (index.js)...
start cmd.exe /k "node index.js"

echo 正在启动AI服务 (spark-ws-client.js)...
start cmd.exe /k "node AI\spark-ws-client.js"

echo 正在启动事故管理服务 (app.js)...
start cmd.exe /k "node accident-management\app.js"

echo.
echo 所有服务已尝试启动。请检查各自的终端窗口。
echo.
pause