// ../utils/auth.js
export const useAuth = () => {
  // 获取当前用户角色
  const getRole = () => {
    return localStorage.getItem('role') || ''
  }
  
  // 判断是否为管理员
  const isAdmin = () => {
    return getRole() === 'admin'
  }
  
  return { isAdmin }
}