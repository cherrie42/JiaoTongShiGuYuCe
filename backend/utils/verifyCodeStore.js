// utils/verifyCodeStore.js
const codeMap = new Map()

/**
 * 设置验证码并记录过期时间（默认 5 分钟）
 * @param {string} email 
 * @param {string} code 
 */
function setCode(email, code) {
  const expireTime = Date.now() + 5 * 60 * 1000
  codeMap.set(email, { code, expireTime })
}

/**
 * 验证验证码是否正确且未过期
 * @param {string} email 
 * @param {string} code 
 * @returns {boolean}
 */
function verifyCode(email, code) {
  const record = codeMap.get(email)
  console.log('Verifying code for:', email)
  if (!record) {
    console.log('No record found')
    return false
  }
  console.log('Stored code:', record.code, 'Input code:', code)
  if (record.code !== code) {
    console.log('Code mismatch')
    return false
  }
  if (Date.now() > record.expireTime) {
    console.log('Code expired')
    codeMap.delete(email)
    return false
  }
  return true
}


/**
 * 清除验证码（注册成功后调用）
 * @param {string} email 
 */
function clearCode(email) {
  codeMap.delete(email)
}

module.exports = { setCode, verifyCode, clearCode }
