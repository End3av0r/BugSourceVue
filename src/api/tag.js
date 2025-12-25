import axios from 'axios'

const API_URL = 'http://localhost:8091/api'

/**
 * 创建标签
 * @param {string} tagName - 标签名称
 * @param {string} description - 标签描述
 * @returns {Promise} - Axios Promise
 */
export function createTag(tagName, description) {
  return axios.post(`${API_URL}/tag/create`, {
    tagName,
    description
  })
}

/**
 * 更新标签
 * @param {number} id - 标签ID
 * @param {string} tagName - 标签名称
 * @param {string} description - 标签描述
 * @returns {Promise} - Axios Promise
 */
export function updateTag(id, tagName, description) {
  return axios.post(`${API_URL}/tag/update`, {
    id,
    tagName,
    description
  })
}

/**
 * 删除标签（逻辑删除）
 * @param {number} id - 标签ID
 * @returns {Promise} - Axios Promise
 */
export function deleteTag(id) {
  return axios.delete(`${API_URL}/tag/delete/${id}`)
}

/**
 * 根据ID查询标签
 * @param {number} id - 标签ID
 * @returns {Promise} - Axios Promise
 */
export function getTagById(id) {
  return axios.get(`${API_URL}/tag/query/${id}`)
}

/**
 * 查询所有标签（仅未删除）
 * @returns {Promise} - Axios Promise
 */
export function getAllTags() {
  return axios.get(`${API_URL}/tag/list`)
}

/**
 * 根据标签名称查询标签详情
 * @param {string} tagName - 标签名称
 * @returns {Promise} - Axios Promise
 */
export function getTagByName(tagName) {
  return axios.get(`${API_URL}/tag/queryByName`, {
    params: { tagName }
  })
}
