'use strict';
const form = document.querySelector('#repair-form');
const submit = document.querySelector('#submit');
const refresh = document.querySelector('#refresh');
const formMessage = document.querySelector('#form-message');
const listMessage = document.querySelector('#list-message');
const requests = document.querySelector('#requests');
let client;
function message(target, text, kind = '') {
  target.textContent = text;
  target.className = kind;
}
// 所有遠端資料均以 textContent 顯示，避免將使用者輸入當成 HTML 執行。
function element(tag, text, className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
async function loadRequests() {
  refresh.disabled = true;
  requests.setAttribute('aria-busy', 'true');
  message(listMessage, '正在載入…');
  try {
    const { data, error } = await client.from('repair_requests')
      .select('id,created_at,reporter_name,location,category,description,urgency,status')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
    if (error) throw error;
    const fragment = document.createDocumentFragment();
    for (const row of data) {
      const card = element('article', '', 'request');
      for (const text of [row.category, `緊急程度：${row.urgency}`, row.status]) card.append(element('span', text, 'badge'));
      card.append(element('h3', `${row.location} · ${row.reporter_name}`));
      card.append(element('p', row.description, 'description'));
      const date = new Date(row.created_at);
      card.append(element('p', `登記時間：${Number.isNaN(date.getTime()) ? '時間不明' : date.toLocaleString('zh-TW')}`, 'meta'));
      fragment.append(card);
    }
    requests.replaceChildren(fragment);
    message(listMessage, data.length ? `已顯示 ${data.length} 筆報修。` : '目前還沒有報修紀錄。');
  } catch {
    message(listMessage, '無法更新清單，請稍後按「重新整理」。若仍有舊資料，其內容可能不是最新。', 'error');
  } finally {
    refresh.disabled = false;
    requests.setAttribute('aria-busy', 'false');
  }
}
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!client || submit.disabled || !form.reportValidity()) return;
  const values = new FormData(form);
  const payload = Object.fromEntries(['reporter_name', 'location', 'category', 'description', 'urgency'].map(key => [key, String(values.get(key) || '').trim()]));
  if (Object.values(payload).some(value => !value)) {
    message(formMessage, '請填寫所有欄位，內容不能只有空白。', 'error');
    return;
  }
  submit.disabled = true;
  submit.textContent = '送出中…';
  message(formMessage, '');
  try {
    // 不傳 status、id、created_at，交由資料庫產生預設值。
    const { error } = await client.from('repair_requests').insert(payload);
    if (error) throw error;
    form.reset();
    message(formMessage, '報修已成功送出！', 'success');
    await loadRequests();
  } catch {
    message(formMessage, '送出未能確認，輸入內容已保留。請先重新整理清單確認是否已新增，再決定是否重試。', 'error');
  } finally {
    submit.disabled = false;
    submit.textContent = '送出報修';
  }
});
refresh.addEventListener('click', () => { if (client) loadRequests(); });
try {
  const config = window.REPAIR_CONFIG;
  client = window.supabase.createClient(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  submit.disabled = false;
  loadRequests();
} catch {
  refresh.disabled = true;
  message(formMessage, '連線元件載入失敗，請檢查網路後重新載入頁面。', 'error');
}
