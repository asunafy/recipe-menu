async function loadMenu() {
  const list = document.getElementById('list')
  list.textContent = '正在打开最新菜单…'
  try {
    const response = await fetch('https://home-recipe-menu-261106.liujiajun152.chatgpt.site/api/menu', {
      cache: 'no-store', credentials: 'omit'
    })
    if (!response.ok) throw new Error('无法读取菜单')
    const menu = await response.json()
    if (!Array.isArray(menu)) throw new Error('菜单格式错误')
    window.menuDishes = menu
    const script = document.createElement('script')
    script.src = './app.js'
    script.onerror = showError
    document.body.append(script)
  } catch { showError() }
  function showError() {
    list.textContent = '菜单暂时打不开，请稍后重新加载。'
    const retry = document.createElement('button')
    retry.textContent = '重新加载'
    retry.onclick = () => location.reload()
    list.append(document.createElement('br'), retry)
  }
}
loadMenu()
