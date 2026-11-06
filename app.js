const $ = id => document.getElementById(id)
const dishes = window.menuDishes
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])
function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return new Set(Array.isArray(value) ? value : [])
  } catch { return new Set() }
}
const favorites = read('recipe-favorites')
const picked = read('recipe-picked')
let tab = 'menu'
let category = '全部'
let categories
function toggle(set, key, id) {
  if (set.has(id)) set.delete(id)
  else set.add(id)
  try { localStorage.setItem(key, JSON.stringify([...set])) } catch {}
  render()
}
function render() {
  categories = ['全部', ...new Set(dishes.map(dish => dish.category))]
  const menu = tab === 'menu'
  const query = $('query').value.trim().toLowerCase()
  const visible = dishes.filter(dish => {
    if (tab === 'favorites') return favorites.has(dish.id)
    if (tab === 'picked') return picked.has(dish.id)
    return (category === '全部' || category === dish.category) && `${dish.name} ${dish.summary}`.toLowerCase().includes(query)
  })
  for (const id of ['intro', 'search', 'filters']) $(id).hidden = !menu
  $('filters').style.display = menu ? 'flex' : 'none'
  $('filters').innerHTML = categories.map((name, i) => `<button data-category="${i}" class="${category === name ? 'active' : ''}" aria-pressed="${category === name}">${escapeHtml(name)}</button>`).join('')
  $('list').innerHTML = visible.map(dish => `
    <article><img src="${escapeHtml(dish.cover)}" alt="" loading="lazy"><section>
    <h2><button data-open="${escapeHtml(dish.id)}">${escapeHtml(dish.name)}</button></h2>
    <p class="muted">${escapeHtml(dish.summary)}</p>
    <footer><button data-favorite="${escapeHtml(dish.id)}" aria-pressed="${favorites.has(dish.id)}">${favorites.has(dish.id) ? '♥ 已收藏' : '♡ 收藏'}</button>
    <button data-pick="${escapeHtml(dish.id)}" aria-pressed="${picked.has(dish.id)}">${picked.has(dish.id) ? '✓ 已选' : '＋ 选这道'}</button></footer>
    </section></article>`).join('') || `<p class="muted">${menu ? '没有找到符合条件的菜谱。' : tab === 'favorites' ? '还没有收藏菜品。' : '还没有选菜，先去菜单挑几道吧。'}</p>`
  $('share').hidden = tab !== 'picked' || visible.length === 0
  $('selection').value = `我想吃这些菜：\n${visible.map(dish => `・${dish.name}`).join('\n')}`
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === tab
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', active)
  })
}
function openRecipe(dish) {
  $('recipe').innerHTML = `<img src="${escapeHtml(dish.cover)}" alt=""><h2>${escapeHtml(dish.name)}</h2>
    <p class="muted">${escapeHtml(dish.summary)} · ${escapeHtml(dish.servings)} 人份</p>
    <h3>食材</h3><ul>${dish.ingredients.map(item => `<li>${escapeHtml(`${item.name} ${item.amount}${item.unit}`)}</li>`).join('')}</ul>
    <h3>做法</h3><ol>${dish.steps.map(step => `<li>${escapeHtml(step.text)}</li>`).join('')}</ol>`
  $('detail').showModal()
}
document.addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button) return
  const data = button.dataset
  if (data.tab) { tab = data.tab; $('notice').textContent = ''; render(); window.scrollTo(0, 0) }
  if (data.category !== undefined) { category = categories[Number(data.category)]; render() }
  if (data.favorite) toggle(favorites, 'recipe-favorites', data.favorite)
  if (data.pick) toggle(picked, 'recipe-picked', data.pick)
  if (data.open) openRecipe(dishes.find(dish => dish.id === data.open))
})
$('search').addEventListener('submit', event => { event.preventDefault(); render() })
$('query').addEventListener('input', render)
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('selection').value)
    $('notice').textContent = '已复制，可以粘贴到微信群。'
  } catch {
    $('selection').focus()
    $('selection').select()
    $('notice').textContent = '请长按选中的文字复制。'
  }
})
render()
