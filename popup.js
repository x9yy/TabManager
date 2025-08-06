// 将函数声明移到全局作用域
window.openGroup = openGroup;
window.deleteGroup = deleteGroup;

document.addEventListener('DOMContentLoaded', () => {
  // 加载已保存的标签组
  loadSavedGroups();

  // 保存标签组按钮点击事件
  document.getElementById('saveGroup').addEventListener('click', saveCurrentTabs);
});

// 保存当前打开的标签页
async function saveCurrentTabs() {
  const groupName = document.getElementById('groupName').value.trim();
  if (!groupName) {
    alert('请输入标签组名称');
    return;
  }

  // 获取当前窗口的所有标签页
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const tabsData = tabs.map(tab => ({
    url: tab.url,
    title: tab.title
  }));

  // 从存储中获取现有的标签组
  const { savedGroups = {} } = await chrome.storage.local.get('savedGroups');
  
  // 添加新的标签组
  savedGroups[groupName] = {
    tabs: tabsData,
    timestamp: Date.now()
  };

  // 保存到 Chrome 存储
  await chrome.storage.local.set({ savedGroups });
  
  // 清空输入框
  document.getElementById('groupName').value = '';
  
  // 重新加载标签组列表
  loadSavedGroups();
}

// 加载已保存的标签组
async function loadSavedGroups() {
  const { savedGroups = {} } = await chrome.storage.local.get('savedGroups');
  const groupsList = document.getElementById('groupsList');
  groupsList.innerHTML = '';

  Object.entries(savedGroups).forEach(([name, data]) => {
    const groupElement = createGroupElement(name, data);
    groupsList.appendChild(groupElement);
  });
}

// 创建标签组元素
function createGroupElement(name, data) {
  const div = document.createElement('div');
  div.className = 'group-item';
  
  const date = new Date(data.timestamp).toLocaleString();
  
  div.innerHTML = `
    <div class="group-info">
      <span class="group-name">${name}</span>
      <span class="tab-count">${data.tabs.length} 个标签页 · ${date}</span>
    </div>
    <div class="group-actions">
      <button class="open-btn">打开</button>
      <button class="delete-btn">删除</button>
    </div>
  `;

  // 添加事件监听器
  const openButton = div.querySelector('.open-btn');
  const deleteButton = div.querySelector('.delete-btn');
  
  openButton.addEventListener('click', () => openGroup(name));
  deleteButton.addEventListener('click', () => deleteGroup(name));
  
  return div;
}

// 打开标签组
async function openGroup(groupName) {
  try {
    const { savedGroups = {} } = await chrome.storage.local.get('savedGroups');
    const group = savedGroups[groupName];
    
    if (!group) {
      alert('找不到该标签组');
      return;
    }

    if (!group.tabs || group.tabs.length === 0) {
      alert('该标签组没有保存任何标签页');
      return;
    }

    // 创建新窗口并打开所有标签页
    const window = await chrome.windows.create({ url: group.tabs[0].url });
    
    // 从第二个标签页开始创建（因为创建窗口时已经创建了第一个标签页）
    for (let i = 1; i < group.tabs.length; i++) {
      await chrome.tabs.create({
        windowId: window.id,
        url: group.tabs[i].url
      });
    }
  } catch (error) {
    console.error('打开标签组时出错:', error);
    alert('打开标签组时出错: ' + error.message);
  }
}

// 删除标签组
async function deleteGroup(groupName) {
  try {
    if (!confirm(`确定要删除标签组 "${groupName}" 吗？`)) return;

    const { savedGroups = {} } = await chrome.storage.local.get('savedGroups');
    
    if (!savedGroups[groupName]) {
      alert('找不到该标签组');
      return;
    }

    delete savedGroups[groupName];
    
    await chrome.storage.local.set({ savedGroups });
    loadSavedGroups();
  } catch (error) {
    console.error('删除标签组时出错:', error);
    alert('删除标签组时出错: ' + error.message);
  }
}