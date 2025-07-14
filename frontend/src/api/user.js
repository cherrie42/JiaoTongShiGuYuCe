// frontend/api/user.js
import request from '@/utils/request'

export const register = (data) => {
  return request.post('/user/register', data)
}

export const login = (data) => {
  return request.post('/user/login', data)
}

export function sendVerificationCode(data) {
  return request.post('/user/sendCode', data)
}

export function getUserList() {
  return request.get('/user/userLists')
}

// 新增用户
export function createUser(data) {
  return request.post('/user/addUser', data)
}

// 修改用户
export function updateUser(id, data) {
  return request.put(`/user/updateUser/${id}`, data)
}

// 删除用户
export function deleteUserById(id) {
  return request.delete(`/user/deleteUser/${id}`)
}

