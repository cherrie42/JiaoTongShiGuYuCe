const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'mail.bjtu.edu.cn',     // SMTP Host
  port: 465,                    // SMTP Port
  secure: true,                 // 使用 SSL
  auth: {
    user: '23301031@bjtu.edu.cn',      // ✅ 你的邮箱
    pass: 'HvdyqFhAi5RXZ2iE'           // ✅ 专用授权码（不可用普通邮箱密码）
  }
})

/**
 * 发送验证码邮件
 * @param {string} to 收件人邮箱
 * @param {string} code 验证码
 */
async function sendVerifyMail(to, code) {
  const mailOptions = {
    from: '"交通事故预测与路线规划系统" <23301031@bjtu.edu.cn>',  // ✅ 必须和 auth.user 完全一致
    to,
    subject: '【--这是一条注册验证码哦！】',
    html: `<p>验证码：<b style="color:blue;">${code}</b>，有效期为 5 分钟。</p>`
  }

  return transporter.sendMail(mailOptions)
}

module.exports = sendVerifyMail
