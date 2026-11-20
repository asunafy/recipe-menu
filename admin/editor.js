const editorStorageKey = 'recipe-custom-dishes'
window.localDishes = []
try {
  const saved = JSON.parse(localStorage.getItem(editorStorageKey))
  if (Array.isArray(saved)) window.localDishes = saved
} catch {}

const editor = document.getElementById('editor')
const dishForm = document.getElementById('dish-form')
const editorStatus = document.getElementById('editor-status')
const lines = value => value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
const ingredientText = item => [item.name, (item.amount || '') + (item.unit || '')].filter(Boolean).join(' ')

function coverImage(file) {
  if (!file.size) return Promise.resolve('../images/dish-placeholder.png')
  if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('请选择小于 15 MB 的图片。'))
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      try {
        const scale = Math.min(1, 900 / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        context.fillStyle = '#fffaf0'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.78))
      } catch {
        reject(new Error('图片处理失败，请换一张图片。'))
      } finally { URL.revokeObjectURL(url) }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取封面，请试试 JPG 或 PNG。'))
    }
    image.src = url
  })
}

let editingDish = null
const deleteDishButton = document.getElementById('delete-dish')
function openEditor(dish = null) {
  editingDish = dish
  dishForm.reset()
  editorStatus.textContent = ''
  document.getElementById('editor-title').textContent = dish ? '编辑菜谱' : '添加菜谱'
  deleteDishButton.hidden = !dish
  if (dish) {
    for (const field of ['name', 'category', 'summary', 'servings']) {
      dishForm.elements.namedItem(field).value = dish[field] ?? ''
    }
    dishForm.elements.namedItem('ingredients').value = dish.ingredients.map(ingredientText).join('\n')
    dishForm.elements.namedItem('steps').value = dish.steps.map(step => step.text).join('\n')
  }
  const options = [...new Set(dishes.map(dish => dish.category))]
  document.getElementById('category-options').replaceChildren(...options.map(value => new Option(value)))
  editor.showModal()
}
document.getElementById('add').onclick = () => openEditor()
deleteDishButton.onclick = () => {
  const dish = editingDish
  if (!dish || !window.confirm('删除「' + dish.name + '」？客人菜单会在下次发布后更新。')) return
  const updated = window.localDishes.filter(item => item.id !== dish.id)
  if (window.menuDishes.some(item => item.id === dish.id)) updated.push({ id: dish.id, deleted: true })
  try {
    localStorage.setItem(editorStorageKey, JSON.stringify(updated))
  } catch {
    editorStatus.textContent = '无法保存删除结果，请检查浏览器存储设置。'
    return
  }
  window.localDishes = updated
  dishes.splice(dishes.indexOf(dish), 1)
  editingDish = null
  render()
  editor.close()
}
dishForm.onsubmit = async event => {
  event.preventDefault()
  const data = new FormData(dishForm)
  const name = data.get('name').trim()
  const category = data.get('category').trim()
  const ingredients = lines(data.get('ingredients')).map(name =>
    editingDish?.ingredients.find(item => ingredientText(item) === name) ?? { name, amount: '', unit: '' }
  )
  const steps = lines(data.get('steps')).map(text => ({ text }))
  if (!name || !category || !ingredients.length || !steps.length) {
    editorStatus.textContent = '请填写菜名、分类、食材和做法。'
    return
  }
  const save = document.getElementById('save-dish')
  const original = editingDish
  save.disabled = true
  deleteDishButton.disabled = true
  try {
    const file = data.get('cover')
    const cover = !file.size && original ? original.cover : await coverImage(file)
    const dish = {
      id: original?.id ?? 'custom-' + crypto.randomUUID(), name, category, cover, ingredients, steps,
      summary: data.get('summary').trim(), servings: Number(data.get('servings'))
    }
    const updated = [...window.localDishes.filter(item => item.id !== dish.id), dish]
    localStorage.setItem(editorStorageKey, JSON.stringify(updated))
    window.localDishes = updated
    if (original) dishes.splice(dishes.indexOf(original), 1, dish)
    else dishes.unshift(dish)
    tab = 'menu'
    categoryForNewDish()
    if (original) editor.close()
    else {
      dishForm.reset()
      editorStatus.textContent = '已保存到当前浏览器，可以继续添加或导出。'
    }
  } catch (error) {
    editorStatus.textContent = error.name === 'QuotaExceededError'
      ? '浏览器存储空间不足，请缩小封面或去掉封面后重试。'
      : error.message
  } finally {
    save.disabled = false
    deleteDishButton.disabled = false
  }
}
document.getElementById('export-dishes').onclick = () => {
  const url = URL.createObjectURL(new Blob(
    ['window.menuDishes = ', JSON.stringify(dishes, null, 2), '\n'],
    { type: 'text/javascript;charset=utf-8' }
  ))
  const link = document.createElement('a')
  link.href = url
  link.download = 'dishes.js'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  editorStatus.textContent = '已导出菜谱备份。正常发布请使用首页的「发布到客人版」。'
}

