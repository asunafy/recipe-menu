const publishDialog = document.getElementById('publish-dialog')
const publishForm = document.getElementById('publish-form')
const tokenInput = document.getElementById('github-token')
const publishDetail = document.getElementById('publish-detail')
const repositoryFile = 'https://api.github.com/repos/asunafy/recipe-menu/contents/dishes.js'
let publishedBaseline = JSON.stringify(window.menuDishes)
let publishing = false

function decodeBase64(value) {
  return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), char => char.charCodeAt(0)))
}
function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
function imageData(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('封面处理失败。'))
    reader.readAsDataURL(blob)
  })
}
async function portableDish(dish) {
  if (dish.cover.startsWith('data:image/')) return { ...dish }
  const url = new URL(dish.cover, location.href)
  if (url.origin !== location.origin) throw new Error('封面必须使用本站图片或上传的照片。')
  const result = await fetch(url, { cache: 'no-store' })
  if (!result.ok) throw new Error('无法读取「' + dish.name + '」的封面。')
  return { ...dish, cover: await imageData(await result.blob()) }
}
function apiError(status) {
  if (status === 401 || status === 403 || status === 404) return 'GitHub 授权失败，请检查令牌是否选中 recipe-menu 并授予 Contents 读写权限。'
  if (status === 409 || status === 422) return '仓库已更新或提交冲突。请导出草稿备份后刷新页面，再核对菜单。'
  return 'GitHub 请求失败（' + status + '），请稍后重试。'
}
document.getElementById('publish-menu').onclick = () => {
  publishDetail.textContent = '将发布已保存的 ' + dishes.length + ' 道菜。'
  publishDialog.showModal()
}
publishDialog.addEventListener('close', () => { tokenInput.value = '' })
publishForm.onsubmit = async event => {
  event.preventDefault()
  if (publishing) return
  const token = tokenInput.value.trim()
  tokenInput.value = ''
  if (!token) return
  publishing = true
  document.getElementById('confirm-publish').disabled = true
  publishDetail.textContent = '正在检查仓库并提交菜单…'
  try {
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }
    const current = await fetch(repositoryFile + '?ref=main', { headers, cache: 'no-store', redirect: 'error' })
    if (!current.ok) throw new Error(apiError(current.status))
    const file = await current.json()
    const source = decodeBase64(file.content).replace(/^window\.menuDishes\s*=\s*/, '').trim()
    const remote = JSON.parse(source)
    if (JSON.stringify(remote) !== publishedBaseline) throw new Error('菜单已在其他设备更新。请先导出草稿备份，然后刷新核对，避免覆盖新内容。')
    const snapshot = await Promise.all(dishes.map(portableDish))
    const content = 'window.menuDishes = ' + JSON.stringify(snapshot, null, 2) + '\n'
    if (new TextEncoder().encode(content).length > 900000) throw new Error('菜单图片总量太大，请缩小封面后再发布。')
    const result = await fetch(repositoryFile, {
      method: 'PUT', redirect: 'error',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Update published recipe menu', content: encodeBase64(content),
        sha: file.sha, branch: 'main'
      })
    })
    if (!result.ok) throw new Error(apiError(result.status))
    publishedBaseline = JSON.stringify(snapshot)
    const message = '已提交到 GitHub，帽子云正在部署。请在帽子云部署记录显示成功后，查看客人版。'
    publishDetail.textContent = message
    document.getElementById('publish-status').textContent = message
  } catch (error) {
    publishDetail.textContent = error.message || '网络连接失败，请重试。'
  } finally {
    publishing = false
    document.getElementById('confirm-publish').disabled = false
  }
}
