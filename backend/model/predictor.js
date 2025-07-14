const { spawn } = require('child_process')

// 假设你有一个 Python 脚本 model.py，接受 JSON 输入，输出风险值
module.exports = (pathArray) => {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['model.py'])

    let data = ''
    py.stdout.on('data', chunk => {
      data += chunk.toString()
    })

    py.stderr.on('data', err => {
      console.error('Python stderr:', err.toString())
    })

    py.on('close', code => {
      if (code !== 0) return reject(new Error('模型执行失败'))
      try {
        const risk = parseFloat(data.trim())
        resolve(risk)
      } catch (err) {
        reject(new Error('模型输出解析失败'))
      }
    })

    // 发送 JSON 数据给 Python
    py.stdin.write(JSON.stringify({ path: pathArray }))
    py.stdin.end()
  })
}
