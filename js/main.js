/**
 * 前端主逻辑文件
 * 数据配置管理系统
 */

// 默认字段定义
const DEFAULT_FIELDS = [
    { name: '变量名', type: 'text', required: true },
    { name: '物理意义', type: 'text', required: true },
    { name: '参数值', type: 'text', required: true },
    { name: '数据类型', type: 'text', required: true },
    { name: '备注', type: 'text', required: false }
];

// 全局状态
let fields = [...DEFAULT_FIELDS.map((f, idx) => ({...f, visible: true, order: idx}))];
let groups = []; // 分组数组，每个元素: { id, name, structName, parentId, children }
let dataRows = []; // 数据行，每个元素包含字段数据和 groupId, index
let nextGroupId = 1;
let editingGroupId = null; // 正在编辑的分组ID
let groupColumnsVisible = true; // 分组列是否显示（默认显示）

// DOM元素
const groupsContainer = document.getElementById('groups-container');
const addGroupBtn = document.getElementById('add-group-btn');
const groupModal = document.getElementById('group-modal');
const groupModalTitle = document.getElementById('group-modal-title');
const closeGroupModalBtn = document.getElementById('close-group-modal-btn');
const confirmGroupBtn = document.getElementById('confirm-group-btn');
const cancelGroupBtn = document.getElementById('cancel-group-btn');
const groupNameInput = document.getElementById('group-name');
const groupStructNameInput = document.getElementById('group-struct-name');
const groupParentSelect = document.getElementById('group-parent');

const fieldsContainer = document.getElementById('fields-container');
const addFieldBtn = document.getElementById('add-field-btn');
const addFieldModal = document.getElementById('add-field-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const confirmAddFieldBtn = document.getElementById('confirm-add-field-btn');
const cancelAddFieldBtn = document.getElementById('cancel-add-field-btn');
const newFieldNameInput = document.getElementById('new-field-name');
const newFieldTypeSelect = document.getElementById('new-field-type');
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');
const addRowBtn = document.getElementById('add-row-btn');
const deleteSelectedBtn = document.getElementById('delete-selected-btn');
const saveBtn = document.getElementById('save-btn');
const exportBtn = document.getElementById('export-btn');

/**
 * 初始化页面
 */
function init() {
    loadData();
    renderGroups();
    renderFields();
    renderTable();
    bindEvents();
}

/**
 * 加载保存的数据
 */
function loadData() {
    const saved = localStorage.getItem('configData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.fields) {
                fields = data.fields;
                // 确保每个字段都有visible和order属性
                fields.forEach((field, index) => {
                    if (field.visible === undefined) field.visible = true;
                    if (field.order === undefined) field.order = index;
                });
                // 按order排序
                fields.sort((a, b) => (a.order || 0) - (b.order || 0));
            }
            if (data.groups) {
                groups = data.groups;
                // 找到最大ID
                groups.forEach(g => {
                    if (g.id >= nextGroupId) nextGroupId = g.id + 1;
                });
            }
            if (data.data) dataRows = data.data;
        } catch (e) {
            console.error('加载数据失败:', e);
        }
    }
}

/**
 * 构建分组树结构
 */
function buildGroupTree() {
    const groupMap = new Map();
    const rootGroups = [];
    
    // 创建映射
    groups.forEach(group => {
        groupMap.set(group.id, { ...group, children: [] });
    });
    
    // 构建树
    groups.forEach(group => {
        const node = groupMap.get(group.id);
        if (group.parentId) {
            const parent = groupMap.get(group.parentId);
            if (parent) {
                parent.children.push(node);
            } else {
                rootGroups.push(node);
            }
        } else {
            rootGroups.push(node);
        }
    });
    
    return rootGroups;
}

/**
 * 渲染分组树
 */
function renderGroups() {
    const tree = buildGroupTree();
    
    if (tree.length === 0) {
        groupsContainer.innerHTML = '<div class="empty-groups">暂无分组，请点击"添加分组"按钮创建</div>';
        return;
    }
    
    let html = '<ul class="group-tree">';
    tree.forEach(group => {
        html += renderGroupNode(group, 0);
    });
    html += '</ul>';
    
    groupsContainer.innerHTML = html;
    
    // 绑定事件
    bindGroupEvents();
}

/**
 * 渲染分组节点（递归）
 */
function renderGroupNode(group, level) {
    const indent = level * 20;
    let html = `<li class="group-node" data-group-id="${group.id}" style="padding-left: ${indent}px;">`;
    
    // 展开/折叠图标
    if (group.children && group.children.length > 0) {
        html += `<span class="group-toggle">▼</span>`;
    } else {
        html += `<span class="group-toggle empty"></span>`;
    }
    
    // 分组信息
    html += `<div class="group-info">`;
    html += `<span class="group-name-display">${escapeHtml(group.name)}</span>`;
    html += `<span class="group-struct-display">(${escapeHtml(group.structName)})</span>`;
    html += `</div>`;
    
    // 操作按钮
    html += `<div class="group-actions">`;
    html += `<button class="btn-icon btn-add-subgroup" data-parent-id="${group.id}" title="添加子分组">+</button>`;
    html += `<button class="btn-icon btn-edit-group" data-group-id="${group.id}" title="编辑">✎</button>`;
    html += `<button class="btn-icon btn-delete-group" data-group-id="${group.id}" title="删除">×</button>`;
    html += `</div>`;
    
    html += `</li>`;
    
    // 子节点
    if (group.children && group.children.length > 0) {
        html += `<ul class="group-children">`;
        group.children.forEach(child => {
            html += renderGroupNode(child, level + 1);
        });
        html += `</ul>`;
    }
    
    return html;
}

/**
 * 绑定分组事件
 */
function bindGroupEvents() {
    // 展开/折叠
    document.querySelectorAll('.group-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            const node = this.closest('.group-node');
            const children = node.nextElementSibling;
            if (children && children.classList.contains('group-children')) {
                children.classList.toggle('collapsed');
                this.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
            }
        });
    });
    
    // 添加子分组
    document.querySelectorAll('.btn-add-subgroup').forEach(btn => {
        btn.addEventListener('click', function() {
            const parentId = parseInt(this.dataset.parentId);
            openGroupModal(null, parentId);
        });
    });
    
    // 编辑分组
    document.querySelectorAll('.btn-edit-group').forEach(btn => {
        btn.addEventListener('click', function() {
            const groupId = parseInt(this.dataset.groupId);
            openGroupModal(groupId);
        });
    });
    
    // 删除分组
    document.querySelectorAll('.btn-delete-group').forEach(btn => {
        btn.addEventListener('click', function() {
            const groupId = parseInt(this.dataset.groupId);
            deleteGroup(groupId);
        });
    });
}

/**
 * 打开分组模态框
 */
function openGroupModal(groupId = null, parentId = null) {
    editingGroupId = groupId;
    
    // 更新标题
    groupModalTitle.textContent = groupId ? '编辑分组' : '新增分组';
    
    // 填充数据
    if (groupId) {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            groupNameInput.value = group.name;
            groupStructNameInput.value = group.structName;
            groupParentSelect.value = group.parentId || '';
        }
    } else {
        groupNameInput.value = '';
        groupStructNameInput.value = '';
        groupParentSelect.value = parentId || '';
    }
    
    // 更新父分组选项
    updateParentGroupOptions(groupId);
    
    groupModal.style.display = 'flex';
    groupNameInput.focus();
}

/**
 * 更新父分组选项
 */
function updateParentGroupOptions(excludeId = null) {
    groupParentSelect.innerHTML = '<option value="">无（顶级分组）</option>';
    
    groups.forEach(group => {
        if (group.id !== excludeId && !isDescendantOf(group.id, excludeId)) {
            const indent = getGroupLevel(group.id) > 0 ? '  '.repeat(getGroupLevel(group.id)) : '';
            groupParentSelect.innerHTML += `<option value="${group.id}">${indent}${escapeHtml(group.name)} (${escapeHtml(group.structName)})</option>`;
        }
    });
}

/**
 * 检查group1是否是group2的后代
 */
function isDescendantOf(groupId1, groupId2) {
    if (!groupId2) return false;
    const group = groups.find(g => g.id === groupId1);
    if (!group || !group.parentId) return false;
    if (group.parentId === groupId2) return true;
    return isDescendantOf(group.parentId, groupId2);
}

/**
 * 获取分组层级
 */
function getGroupLevel(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group || !group.parentId) return 0;
    return 1 + getGroupLevel(group.parentId);
}

/**
 * 关闭分组模态框
 */
function closeGroupModal() {
    groupModal.style.display = 'none';
    editingGroupId = null;
    groupNameInput.value = '';
    groupStructNameInput.value = '';
    groupParentSelect.value = '';
}

/**
 * 保存分组
 */
function saveGroup() {
    const name = groupNameInput.value.trim();
    const structName = groupStructNameInput.value.trim();
    const parentId = groupParentSelect.value ? parseInt(groupParentSelect.value) : null;
    
    if (!name) {
        alert('请输入组名');
        return;
    }
    
    if (!structName) {
        alert('请输入数据结构名字');
        return;
    }
    
    if (editingGroupId) {
        // 编辑模式
        const group = groups.find(g => g.id === editingGroupId);
        if (group) {
            group.name = name;
            group.structName = structName;
            group.parentId = parentId;
        }
    } else {
        // 新增模式
        groups.push({
            id: nextGroupId++,
            name: name,
            structName: structName,
            parentId: parentId
        });
    }
    
    renderGroups();
    renderTable();
    closeGroupModal();
}

/**
 * 删除分组
 */
function deleteGroup(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    // 检查是否有子分组
    const hasChildren = groups.some(g => g.parentId === groupId);
    if (hasChildren) {
        alert('该分组下还有子分组，请先删除子分组');
        return;
    }
    
    // 检查是否有数据行使用该分组
    const hasData = dataRows.some(row => row.groupId === groupId);
    if (hasData) {
        if (!confirm('该分组下还有数据，删除后这些数据将失去分组关联。确定要删除吗？')) {
            return;
        }
    }
    
    groups = groups.filter(g => g.id !== groupId);
    renderGroups();
    renderTable();
}

/**
 * 渲染字段定义区域
 */
function renderFields() {
    // 按order排序
    const sortedFields = [...fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    fieldsContainer.innerHTML = '';
    
    sortedFields.forEach((field, sortedIndex) => {
        const originalIndex = fields.indexOf(field);
        const fieldItem = document.createElement('div');
        fieldItem.className = 'field-item';
        fieldItem.dataset.index = originalIndex;
        if (!field.visible) {
            fieldItem.classList.add('field-hidden');
        }
        
        const isDefault = originalIndex < DEFAULT_FIELDS.length;
        
        fieldItem.innerHTML = `
            <div class="field-checkbox">
                <input type="checkbox" class="field-visibility-checkbox" data-index="${originalIndex}" ${field.visible ? 'checked' : ''} title="显示/隐藏">
            </div>
            <div class="field-name">
                <span class="field-label">${field.name}</span>
                ${field.required ? '<span class="required-badge">必填</span>' : ''}
            </div>
            <div class="field-type">
                <span class="type-badge type-${field.type}">${getTypeLabel(field.type)}</span>
            </div>
            ${!isDefault ? `
                <button class="btn-icon btn-delete-field" data-index="${originalIndex}" title="删除字段">
                    <span>&times;</span>
                </button>
            ` : ''}
        `;
        
        fieldsContainer.appendChild(fieldItem);
    });
    
    // 绑定删除字段事件
    document.querySelectorAll('.btn-delete-field').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            deleteField(index);
        });
    });
    
    // 绑定字段显示/隐藏事件
    document.querySelectorAll('.field-visibility-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(checkbox.dataset.index);
            toggleFieldVisibility(index);
        });
    });
    
    // 绑定全选/取消全选
    const toggleAllFields = document.getElementById('toggle-all-fields');
    if (toggleAllFields) {
        const allVisible = fields.every(f => f.visible);
        toggleAllFields.checked = allVisible;
        toggleAllFields.addEventListener('change', (e) => {
            const checked = e.target.checked;
            fields.forEach((field, index) => {
                field.visible = checked;
            });
            renderFields();
            renderTable();
        });
    }
    
    // 添加分组列显示/隐藏控制（如果不存在）
    let groupColumnsControl = document.getElementById('toggle-group-columns');
    if (!groupColumnsControl) {
        const controlContainer = document.createElement('div');
        controlContainer.className = 'group-columns-control';
        controlContainer.innerHTML = `
            <label class="field-visibility-toggle">
                <input type="checkbox" id="toggle-group-columns" ${groupColumnsVisible ? 'checked' : ''}> 显示分组列
            </label>
        `;
        fieldsContainer.parentElement.querySelector('.section-header .field-controls').appendChild(controlContainer);
        
        groupColumnsControl = document.getElementById('toggle-group-columns');
        groupColumnsControl.addEventListener('change', (e) => {
            groupColumnsVisible = e.target.checked;
            renderTable();
        });
    } else {
        // 更新复选框状态
        groupColumnsControl.checked = groupColumnsVisible;
    }
}

/**
 * 切换字段显示/隐藏
 */
function toggleFieldVisibility(index) {
    if (fields[index]) {
        fields[index].visible = !fields[index].visible;
        renderFields();
        renderTable();
    }
}

/**
 * 获取分组最大层级深度
 */
function getMaxGroupLevel() {
    if (groups.length === 0) return -1;
    
    let maxLevel = 0;
    groups.forEach(group => {
        const level = getGroupLevel(group.id);
        if (level > maxLevel) {
            maxLevel = level;
        }
    });
    return maxLevel;
}

/**
 * 获取分组在指定层级的值
 */
function getGroupAtLevel(groupId, level) {
    if (!groupId) return null;
    const path = getGroupPath(groupId);
    if (path.length === 0) return null;
    return path[level] || null;
}

/**
 * 获取类型标签
 */
function getTypeLabel(type) {
    const labels = {
        'text': '文本',
        'number': '数字',
        'date': '日期',
        'boolean': '布尔值'
    };
    return labels[type] || type;
}

/**
 * 获取可见字段
 */
function getVisibleFields() {
    return fields.filter(f => f.visible).sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * 渲染数据表格
 */
function renderTable() {
    const visibleFields = getVisibleFields();
    const maxLevel = getMaxGroupLevel();
    
    // 渲染表头
    let headHtml = '<tr>';
    headHtml += '<th class="checkbox-col"><input type="checkbox" id="select-all"></th>';
    headHtml += '<th class="index-col">序号</th>';
    
    // 添加分组列（始终渲染，根据groupColumnsVisible控制显示）
    if (maxLevel >= 0) {
        for (let level = 0; level <= maxLevel; level++) {
            headHtml += `<th class="group-col" style="display: ${groupColumnsVisible ? 'table-cell' : 'none'};">分组 L${level + 1}</th>`;
        }
    }
    
    visibleFields.forEach(field => {
        headHtml += `<th>${field.name}${field.required ? '<span class="required">*</span>' : ''}</th>`;
    });
    headHtml += '</tr>';
    tableHead.innerHTML = headHtml;
    
    // 绑定全选事件
    const selectAll = document.getElementById('select-all');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.checked = checked;
            });
        });
    }
    
    // 渲染表体
    renderTableBody();
}

/**
 * 获取分组路径（用于显示层级）
 */
function getGroupPath(groupId) {
    if (!groupId) return '';
    const group = groups.find(g => g.id === groupId);
    if (!group) return '';
    
    const path = [];
    let currentGroup = group;
    while (currentGroup) {
        path.unshift(currentGroup);
        currentGroup = currentGroup.parentId ? groups.find(g => g.id === currentGroup.parentId) : null;
    }
    return path;
}

/**
 * 获取分组树的顺序（深度优先遍历）
 * 返回分组ID数组，按照分组管理中的显示顺序
 */
function getGroupTreeOrder() {
    const tree = buildGroupTree();
    const order = [];
    
    function traverse(node) {
        order.push(node.id);
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => traverse(child));
        }
    }
    
    tree.forEach(root => traverse(root));
    return order;
}

/**
 * 根据分组树顺序获取分组的排序值
 */
function getGroupSortValue(groupId) {
    if (!groupId) return Infinity; // 无分组排在最后
    const order = getGroupTreeOrder();
    const index = order.indexOf(groupId);
    return index === -1 ? Infinity : index;
}

/**
 * 渲染表体
 */
function renderTableBody() {
    const visibleFields = getVisibleFields();
    const maxLevel = getMaxGroupLevel();
    
    // 按分组和序号排序
    const sortedRows = [...dataRows].sort((a, b) => {
        if (a.groupId !== b.groupId) {
            return (a.groupId || 0) - (b.groupId || 0);
        }
        return (a.index || 0) - (b.index || 0);
    });
    
    if (sortedRows.length === 0) {
        const colspan = visibleFields.length + 2 + (maxLevel >= 0 ? (maxLevel + 1) : 0);
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-message">暂无数据，请点击"添加行"按钮添加数据</td></tr>`;
        return;
    }
    
    // 按分组分组数据，同时保存dataRows中的实际索引
    const groupedData = {};
    sortedRows.forEach((sortedRow) => {
        const groupId = sortedRow.groupId || 'ungrouped';
        if (!groupedData[groupId]) {
            groupedData[groupId] = [];
        }
        // 找到该行在dataRows中的实际索引
        const actualIndex = dataRows.findIndex(r => r === sortedRow);
        groupedData[groupId].push({ row: sortedRow, originalIndex: actualIndex });
    });
    
    // 为每个分组计算序号（只对没有序号或序号无效的行进行自动计算）
    Object.keys(groupedData).forEach(groupId => {
        // 先按现有序号排序
        groupedData[groupId].sort((a, b) => {
            const indexA = a.row.index || 0;
            const indexB = b.row.index || 0;
            return indexA - indexB;
        });
        
        // 找出该分组中有效的最大序号
        let maxIndex = 0;
        groupedData[groupId].forEach(({ row }) => {
            if (row.index && row.index > maxIndex) {
                maxIndex = row.index;
            }
        });
        
        // 为没有序号或序号无效的行分配序号
        let indexCounter = maxIndex + 1;
        groupedData[groupId].forEach(({ row }) => {
            if (!row.index || row.index <= 0) {
                row.index = indexCounter++;
            }
        });
        
        // 重新按序号排序，确保显示顺序正确
        groupedData[groupId].sort((a, b) => {
            const indexA = a.row.index || 0;
            const indexB = b.row.index || 0;
            return indexA - indexB;
        });
    });
    
    // 渲染表格
    let bodyHtml = '';
    let currentGroupId = null;
    
    // 获取所有分组ID并按照分组树顺序排序
    const groupIds = Object.keys(groupedData).sort((a, b) => {
        if (a === 'ungrouped') return 1;
        if (b === 'ungrouped') return -1;
        const aId = parseInt(a);
        const bId = parseInt(b);
        return getGroupSortValue(aId) - getGroupSortValue(bId);
    });
    
    groupIds.forEach(groupId => {
        const groupRows = groupedData[groupId];
        const actualGroupId = groupId === 'ungrouped' ? null : parseInt(groupId);
        
        // 如果切换了分组，显示分组标题
        if (actualGroupId !== currentGroupId) {
            currentGroupId = actualGroupId;
            
            if (actualGroupId) {
                const group = groups.find(g => g.id === actualGroupId);
                if (group) {
                    const path = getGroupPath(actualGroupId);
                    const level = path.length - 1;
                    const indent = level * 30;
                    const colspan = visibleFields.length + 2 + (maxLevel >= 0 ? (maxLevel + 1) : 0);
                    
                    bodyHtml += `<tr class="group-header-row" data-group-id="${actualGroupId}">`;
                    bodyHtml += `<td colspan="${colspan}" class="group-header-cell" style="padding-left: ${indent + 20}px;">`;
                    bodyHtml += `<div class="group-header-content">`;
                    
                    // 显示层级路径
                    path.forEach((g, idx) => {
                        if (idx > 0) bodyHtml += `<span class="group-separator"> > </span>`;
                        bodyHtml += `<span class="group-name-display">${escapeHtml(g.name)}</span>`;
                        bodyHtml += `<span class="group-struct-display"> (${escapeHtml(g.structName)})</span>`;
                    });
                    
                    // 添加编辑按钮
                    bodyHtml += `<button class="btn-group-edit" data-group-id="${actualGroupId}" title="编辑分组">✎</button>`;
                    bodyHtml += `</div>`;
                    bodyHtml += `</td>`;
                    bodyHtml += `</tr>`;
                }
            }
        }
        
        // 渲染该分组的数据行
        groupRows.forEach(({ row, originalIndex }, rowIndexInGroup) => {
            const isFirstInGroup = rowIndexInGroup === 0;
            const isLastInGroup = rowIndexInGroup === groupRows.length - 1;
            
            bodyHtml += `<tr data-row-index="${originalIndex}" data-group-id="${actualGroupId || ''}">`;
            bodyHtml += `<td class="checkbox-col"><input type="checkbox" class="row-checkbox" data-row-index="${originalIndex}"></td>`;
            
            // 序号列（包含位置调整按钮）
            bodyHtml += `<td class="index-col">`;
            bodyHtml += `<div class="index-control-group">`;
            bodyHtml += `<button class="btn-move-up" data-row-index="${originalIndex}" ${isFirstInGroup ? 'disabled' : ''} title="上移">↑</button>`;
            bodyHtml += `<input type="number" class="index-input" data-row-index="${originalIndex}" value="${row.index || ''}" min="1">`;
            bodyHtml += `<button class="btn-move-down" data-row-index="${originalIndex}" ${isLastInGroup ? 'disabled' : ''} title="下移">↓</button>`;
            bodyHtml += `</div>`;
            bodyHtml += `</td>`;
            
            // 分组列（始终渲染，根据groupColumnsVisible控制显示）
            if (maxLevel >= 0) {
                // 获取当前行已选择的分组路径
                const currentPath = row.groupId ? getGroupPath(row.groupId) : [];
                
                for (let level = 0; level <= maxLevel; level++) {
                    const groupAtLevel = getGroupAtLevel(row.groupId, level);
                    
                    // 判断该层级是否应该显示
                    // 如果是子级（level > 0），需要检查父级是否已选择
                    let shouldShow = true;
                    let isDisabled = false;
                    let parentGroupId = null;
                    
                    if (level > 0) {
                        // 检查父级是否已选择
                        const parentAtLevel = level > 0 ? getGroupAtLevel(row.groupId, level - 1) : null;
                        if (!parentAtLevel) {
                            // 父级未选择，子级应该禁用
                            shouldShow = true; // 仍然显示，但禁用
                            isDisabled = true;
                        } else {
                            parentGroupId = parentAtLevel.id;
                        }
                    }
                    
                    // 检查该层级是否有分组（如果父级已选择，只检查父级下的子分组）
                    let groupsAtLevel = [];
                    if (level === 0) {
                        // 顶级分组：获取所有没有父级的分组
                        groupsAtLevel = groups.filter(g => !g.parentId);
                    } else {
                        // 子级分组：根据父级ID过滤
                        if (parentGroupId) {
                            groupsAtLevel = groups.filter(g => g.parentId === parentGroupId);
                        } else {
                            // 如果没有父级，不显示任何选项
                            groupsAtLevel = [];
                        }
                    }
                    
                    // 如果该层级没有分组选项，且当前行也没有选择该层级的分组，则隐藏该列
                    // 但如果父级有子分组（即使当前未选择），仍然显示该列以便用户选择
                    if (level > 0 && groupsAtLevel.length === 0 && !groupAtLevel) {
                        // 检查父级是否有子分组（即使当前未选择）
                        const parentAtLevel = getGroupAtLevel(row.groupId, level - 1);
                        if (!parentAtLevel) {
                            // 父级未选择，且该层级没有选项，隐藏该列
                            continue;
                        }
                        // 检查父级是否有子分组
                        const parentHasChildren = groups.some(g => g.parentId === parentAtLevel.id);
                        if (!parentHasChildren) {
                            // 父级没有子分组，隐藏该列
                            continue;
                        }
                    }
                    
                    bodyHtml += `<td class="group-col" style="display: ${groupColumnsVisible ? 'table-cell' : 'none'};">`;
                    bodyHtml += `<select class="group-level-select" data-row-index="${originalIndex}" data-level="${level}" ${isDisabled ? 'disabled' : ''}>`;
                    bodyHtml += `<option value="">无</option>`;
                    
                    groupsAtLevel.forEach(g => {
                        const selected = groupAtLevel && groupAtLevel.id === g.id ? 'selected' : '';
                        bodyHtml += `<option value="${g.id}" ${selected}>${escapeHtml(g.name)} (${escapeHtml(g.structName)})</option>`;
                    });
                    
                    bodyHtml += `</select>`;
                    bodyHtml += `</td>`;
                }
            }
            
            // 字段列（只显示可见字段）
            visibleFields.forEach((field) => {
                const value = row[field.name] || '';
                const inputType = getInputType(field.type);
                const inputClass = field.required && !value ? 'required-empty' : '';
                
                bodyHtml += `<td>`;
                if (field.type === 'boolean') {
                    bodyHtml += `<select class="data-input ${inputClass}" data-field="${field.name}" data-row="${originalIndex}">
                        <option value="">请选择</option>
                        <option value="true" ${value === 'true' || value === true ? 'selected' : ''}>是</option>
                        <option value="false" ${value === 'false' || value === false ? 'selected' : ''}>否</option>
                    </select>`;
                } else {
                    bodyHtml += `<input type="${inputType}" class="data-input ${inputClass}" 
                        data-field="${field.name}" 
                        data-row="${originalIndex}" 
                        value="${escapeHtml(value)}"
                        ${field.required ? 'required' : ''}
                        ${field.type === 'date' ? 'placeholder="YYYY-MM-DD"' : ''}>`;
                }
                bodyHtml += `</td>`;
            });
            
            bodyHtml += '</tr>';
        });
    });
    
    tableBody.innerHTML = bodyHtml;
    
    // 绑定输入事件
    document.querySelectorAll('.data-input').forEach(input => {
        input.addEventListener('change', handleDataChange);
        input.addEventListener('blur', handleDataChange);
    });
    
    // 绑定序号输入事件
    document.querySelectorAll('.index-input').forEach(input => {
        input.addEventListener('change', handleIndexChange);
    });
    
    // 绑定行位置调整按钮
    document.querySelectorAll('.btn-move-up').forEach(btn => {
        btn.addEventListener('click', function() {
            const rowIndex = parseInt(this.dataset.rowIndex);
            moveRowUp(rowIndex);
        });
    });
    
    document.querySelectorAll('.btn-move-down').forEach(btn => {
        btn.addEventListener('click', function() {
            const rowIndex = parseInt(this.dataset.rowIndex);
            moveRowDown(rowIndex);
        });
    });
    
    // 绑定分组选择事件
    document.querySelectorAll('.group-level-select').forEach(select => {
        select.addEventListener('change', function() {
            const rowIndex = parseInt(this.dataset.rowIndex);
            const level = parseInt(this.dataset.level);
            const selectedGroupId = this.value ? parseInt(this.value) : null;
            
            // 检查索引是否有效
            if (rowIndex < 0 || rowIndex >= dataRows.length) {
                console.error('Invalid row index:', rowIndex, 'dataRows length:', dataRows.length);
                return;
            }
            
            if (selectedGroupId) {
                // 检查该分组是否有子分组
                const hasChildren = groups.some(g => g.parentId === selectedGroupId);
                
                if (hasChildren) {
                    // 如果有子分组，暂时使用当前选择的分组ID
                    // 但不自动选择子分组，让用户手动选择
                    dataRows[rowIndex].groupId = selectedGroupId;
                } else {
                    // 如果没有子分组，直接使用该分组
                    dataRows[rowIndex].groupId = selectedGroupId;
                }
                
                // 清除所有更深层级的选择
                // 重新渲染表格以更新子级下拉框
                
                // 更新序号：使用新分组的最大序号+1（排除当前行）
                const maxIndex = getMaxIndexForGroup(selectedGroupId, rowIndex);
                dataRows[rowIndex].index = maxIndex + 1;
            } else {
                // 如果取消选择，需要清除该层级及所有更深层级的选择
                const currentPath = getGroupPath(dataRows[rowIndex].groupId);
                
                if (level === 0) {
                    // 取消顶级分组，清除所有分组关联
                    dataRows[rowIndex].groupId = null;
                } else {
                    // 取消子级分组，回到父级分组
                    if (currentPath && currentPath.length > level && level > 0) {
                        const parentGroup = currentPath[level - 1];
                        if (parentGroup) {
                            dataRows[rowIndex].groupId = parentGroup.id;
                        } else {
                            dataRows[rowIndex].groupId = null;
                        }
                    } else {
                        dataRows[rowIndex].groupId = null;
                    }
                }
                
                // 更新序号（排除当前行）
                const newGroupId = dataRows[rowIndex].groupId;
                const maxIndex = getMaxIndexForGroup(newGroupId, rowIndex);
                dataRows[rowIndex].index = maxIndex + 1;
            }
            
            // 重新渲染表格以更新子级下拉框选项
            renderTable();
        });
    });
    
    // 绑定分组编辑按钮
    document.querySelectorAll('.btn-group-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const groupId = parseInt(this.dataset.groupId);
            openGroupModal(groupId);
        });
    });
}

/**
 * 获取输入类型
 */
function getInputType(fieldType) {
    const typeMap = {
        'text': 'text',
        'number': 'number',
        'date': 'date',
        'boolean': 'select'
    };
    return typeMap[fieldType] || 'text';
}

/**
 * HTML转义
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 处理数据变化
 */
function handleDataChange(e) {
    const field = e.target.dataset.field;
    const rowIndex = parseInt(e.target.dataset.row);
    const value = e.target.value;
    
    if (!dataRows[rowIndex]) {
        dataRows[rowIndex] = {};
    }
    
    dataRows[rowIndex][field] = value;
    
    // 更新必填字段样式
    const fieldObj = fields.find(f => f.name === field);
    if (fieldObj && fieldObj.required) {
        if (value) {
            e.target.classList.remove('required-empty');
        } else {
            e.target.classList.add('required-empty');
        }
    }
}

/**
 * 处理序号变化（支持自动排序）
 */
function handleIndexChange(e) {
    const rowIndex = parseInt(e.target.dataset.rowIndex);
    const value = parseInt(e.target.value) || 1;
    
    if (rowIndex < 0 || rowIndex >= dataRows.length) {
        console.error('Invalid row index:', rowIndex);
        return;
    }
    
    if (!dataRows[rowIndex]) {
        dataRows[rowIndex] = {};
    }
    
    const oldIndex = dataRows[rowIndex].index || 1;
    const newIndex = value;
    const groupId = dataRows[rowIndex].groupId;
    
    // 如果序号发生变化，需要调整同一分组内其他行的序号
    if (oldIndex !== newIndex) {
        // 获取同一分组内的所有行
        const rowsInGroup = dataRows
            .map((r, idx) => ({ row: r, index: idx }))
            .filter(({ row: r }) => r.groupId === groupId);
        
        // 如果新序号小于旧序号，需要将中间行的序号+1
        if (newIndex < oldIndex) {
            rowsInGroup.forEach(({ row: r, index: idx }) => {
                if (idx !== rowIndex && r.index >= newIndex && r.index < oldIndex) {
                    r.index = (r.index || 1) + 1;
                }
            });
        } else {
            // 如果新序号大于旧序号，需要将中间行的序号-1
            rowsInGroup.forEach(({ row: r, index: idx }) => {
                if (idx !== rowIndex && r.index > oldIndex && r.index <= newIndex) {
                    r.index = Math.max(1, (r.index || 1) - 1);
                }
            });
        }
        
        dataRows[rowIndex].index = newIndex;
    }
    
    // 重新渲染表格以更新排序
    renderTable();
}

/**
 * 上移行（在同一分组内）
 */
function moveRowUp(rowIndex) {
    if (rowIndex < 0 || rowIndex >= dataRows.length) {
        console.error('Invalid row index:', rowIndex);
        return;
    }
    
    const row = dataRows[rowIndex];
    const groupId = row.groupId;
    
    // 找到同一分组内的所有行，按序号排序
    const rowsInGroup = dataRows
        .map((r, idx) => ({ row: r, index: idx }))
        .filter(({ row: r }) => r.groupId === groupId)
        .sort((a, b) => (a.row.index || 0) - (b.row.index || 0));
    
    // 找到当前行在排序后的位置
    const currentPos = rowsInGroup.findIndex(({ index }) => index === rowIndex);
    if (currentPos <= 0) return; // 已经是第一行
    
    // 交换序号
    const prevRow = rowsInGroup[currentPos - 1];
    const tempIndex = row.index || 1;
    row.index = prevRow.row.index || 1;
    prevRow.row.index = tempIndex;
    
    renderTable();
}

/**
 * 下移行（在同一分组内）
 */
function moveRowDown(rowIndex) {
    if (rowIndex < 0 || rowIndex >= dataRows.length) {
        console.error('Invalid row index:', rowIndex);
        return;
    }
    
    const row = dataRows[rowIndex];
    const groupId = row.groupId;
    
    // 找到同一分组内的所有行，按序号排序
    const rowsInGroup = dataRows
        .map((r, idx) => ({ row: r, index: idx }))
        .filter(({ row: r }) => r.groupId === groupId)
        .sort((a, b) => (a.row.index || 0) - (b.row.index || 0));
    
    // 找到当前行在排序后的位置
    const currentPos = rowsInGroup.findIndex(({ index }) => index === rowIndex);
    if (currentPos < 0 || currentPos >= rowsInGroup.length - 1) return; // 已经是最后一行
    
    // 交换序号
    const nextRow = rowsInGroup[currentPos + 1];
    const tempIndex = row.index || 1;
    row.index = nextRow.row.index || 1;
    nextRow.row.index = tempIndex;
    
    renderTable();
}


/**
 * 添加新字段
 */
function addField() {
    const name = newFieldNameInput.value.trim();
    const type = newFieldTypeSelect.value;
    
    if (!name) {
        alert('请输入字段名称');
        return;
    }
    
    // 检查字段名是否已存在
    if (fields.some(f => f.name === name)) {
        alert('字段名称已存在');
        return;
    }
    
    const maxOrder = Math.max(...fields.map(f => f.order || 0), -1);
    fields.push({
        name: name,
        type: type,
        required: false,
        visible: true,
        order: maxOrder + 1
    });
    
    // 更新现有数据行，为新字段添加空值
    dataRows.forEach(row => {
        row[name] = '';
    });
    
    renderFields();
    renderTable();
    closeAddFieldModal();
}

/**
 * 删除字段
 */
function deleteField(index) {
    if (index < DEFAULT_FIELDS.length) {
        alert('默认字段不能删除');
        return;
    }
    
    if (confirm(`确定要删除字段"${fields[index].name}"吗？删除后该字段的所有数据将被清除。`)) {
        const fieldName = fields[index].name;
        fields.splice(index, 1);
        
        // 从所有数据行中删除该字段
        dataRows.forEach(row => {
            delete row[fieldName];
        });
        
        renderFields();
        renderTable();
    }
}

/**
 * 获取指定分组的最大序号
 * @param {number|null} groupId - 分组ID，null表示无分组
 * @param {number} excludeRowIndex - 要排除的行索引（可选）
 */
function getMaxIndexForGroup(groupId, excludeRowIndex = -1) {
    const rowsInGroup = dataRows.filter((row, index) => {
        return row.groupId === groupId && index !== excludeRowIndex;
    });
    if (rowsInGroup.length === 0) return 0;
    return Math.max(...rowsInGroup.map(row => row.index || 0), 0);
}

/**
 * 添加数据行
 */
function addRow() {
    // 计算新行的序号：如果是无分组，找无分组的最大序号；如果有分组，找该分组的最大序号
    const newGroupId = null; // 默认无分组，用户可以在表格中选择分组
    const maxIndex = getMaxIndexForGroup(newGroupId);
    
    const newRow = {
        index: maxIndex + 1,
        groupId: newGroupId
    };
    fields.forEach(field => {
        newRow[field.name] = '';
    });
    dataRows.push(newRow);
    renderTable();
}

/**
 * 在数据表格中编辑行的分组
 */
function editRowGroup(rowIndex) {
    const row = dataRows[rowIndex];
    if (!row) return;
    
    // 创建临时选择器让用户选择分组
    const groupNames = groups.map(g => `${g.name} (${g.structName})`);
    const options = ['无分组', ...groupNames];
    const selected = row.groupId ? groups.findIndex(g => g.id === row.groupId) + 1 : 0;
    
    // 使用prompt简单实现，实际可以用更优雅的方式
    const input = prompt(`请选择分组（输入序号）:\n${options.map((opt, idx) => `${idx}: ${opt}`).join('\n')}`, selected);
    if (input !== null) {
        const selectedIndex = parseInt(input);
        if (selectedIndex === 0) {
            row.groupId = null;
        } else if (selectedIndex > 0 && selectedIndex <= groups.length) {
            row.groupId = groups[selectedIndex - 1].id;
        }
        renderTable();
    }
}

/**
 * 删除选中的行
 */
function deleteSelectedRows() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert('请先选择要删除的行');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${checkedBoxes.length} 行数据吗？`)) {
        const indicesToDelete = Array.from(checkedBoxes)
            .map(cb => parseInt(cb.dataset.rowIndex))
            .sort((a, b) => b - a); // 从后往前删除，避免索引变化
        
        indicesToDelete.forEach(index => {
            dataRows.splice(index, 1);
        });
        
        renderTable();
    }
}

/**
 * 保存数据
 */
function saveData() {
    // 验证必填字段
    let hasError = false;
    dataRows.forEach((row, rowIndex) => {
        fields.forEach(field => {
            if (field.required && !row[field.name]) {
                hasError = true;
                const input = document.querySelector(
                    `.data-input[data-field="${field.name}"][data-row="${rowIndex}"]`
                );
                if (input) {
                    input.classList.add('required-empty');
                    input.focus();
                }
            }
        });
    });
    
    if (hasError) {
        alert('请填写所有必填字段');
        return;
    }
    
    // 保存到localStorage
    const dataToSave = {
        fields: fields,
        groups: groups,
        data: dataRows,
        nextGroupId: nextGroupId,
        timestamp: new Date().toISOString()
    };
    
    // 同时保存字段的visible和order状态
    
    localStorage.setItem('configData', JSON.stringify(dataToSave));
    alert('数据已保存到本地存储');
}

/**
 * 导出数据（按照页面显示顺序）
 */
function exportData() {
    if (dataRows.length === 0) {
        alert('没有数据可导出');
        return;
    }
    
    const visibleFields = getVisibleFields();
    const maxLevel = getMaxGroupLevel();
    
    // 按照页面显示顺序排序（与renderTableBody相同的逻辑）
    const sortedRows = [...dataRows].sort((a, b) => {
        if (a.groupId !== b.groupId) {
            const aSortValue = getGroupSortValue(a.groupId);
            const bSortValue = getGroupSortValue(b.groupId);
            return aSortValue - bSortValue;
        }
        return (a.index || 0) - (b.index || 0);
    });
    
    // 按分组分组数据
    const groupedData = {};
    sortedRows.forEach((row) => {
        const groupId = row.groupId || 'ungrouped';
        if (!groupedData[groupId]) {
            groupedData[groupId] = [];
        }
        groupedData[groupId].push({ row });
    });
    
    // 为每个分组计算序号
    Object.keys(groupedData).forEach(groupId => {
        groupedData[groupId].sort((a, b) => {
            const indexA = a.row.index || 0;
            const indexB = b.row.index || 0;
            return indexA - indexB;
        });
    });
    
    // 获取所有分组ID并按照分组树顺序排序
    const groupIds = Object.keys(groupedData).sort((a, b) => {
        if (a === 'ungrouped') return 1;
        if (b === 'ungrouped') return -1;
        const aId = parseInt(a);
        const bId = parseInt(b);
        return getGroupSortValue(aId) - getGroupSortValue(bId);
    });
    
    // 生成CSV格式
    let csv = '';
    
    // 表头
    csv += '"总序号","序号","父级分组","分组",';
    csv += visibleFields.map(f => `"${f.name}"`).join(',') + '\n';
    
    // 数据行（按照页面显示顺序）
    let totalIndex = 1;
    groupIds.forEach(groupId => {
        const groupRows = groupedData[groupId];
        const actualGroupId = groupId === 'ungrouped' ? null : parseInt(groupId);
        
        groupRows.forEach(({ row }) => {
            // 获取分组信息
            const group = row.groupId ? groups.find(g => g.id === row.groupId) : null;
            const groupName = group ? `${group.name} (${group.structName})` : '';
            
            // 获取父级分组信息
            let parentGroupName = '';
            if (group && group.parentId) {
                const parentGroup = groups.find(g => g.id === group.parentId);
                if (parentGroup) {
                    parentGroupName = `${parentGroup.name} (${parentGroup.structName})`;
                }
            }
            
            csv += `"${totalIndex}","${row.index || ''}","${parentGroupName}","${groupName}",`;
            csv += visibleFields.map(f => `"${row[f.name] || ''}"`).join(',') + '\n';
            totalIndex++;
        });
    });
    
    // 下载文件
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `数据导出_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 打开新增字段模态框
 */
function openAddFieldModal() {
    newFieldNameInput.value = '';
    newFieldTypeSelect.value = 'text';
    addFieldModal.style.display = 'flex';
    newFieldNameInput.focus();
}

/**
 * 关闭新增字段模态框
 */
function closeAddFieldModal() {
    addFieldModal.style.display = 'none';
    newFieldNameInput.value = '';
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 新增字段按钮
    addFieldBtn.addEventListener('click', openAddFieldModal);
    
    // 新增分组按钮
    addGroupBtn.addEventListener('click', () => openGroupModal());
    
    // 字段模态框关闭
    closeModalBtn.addEventListener('click', closeAddFieldModal);
    cancelAddFieldBtn.addEventListener('click', closeAddFieldModal);
    
    // 分组模态框关闭
    closeGroupModalBtn.addEventListener('click', closeGroupModal);
    cancelGroupBtn.addEventListener('click', closeGroupModal);
    
    // 点击模态框外部关闭
    addFieldModal.addEventListener('click', (e) => {
        if (e.target === addFieldModal) {
            closeAddFieldModal();
        }
    });
    
    groupModal.addEventListener('click', (e) => {
        if (e.target === groupModal) {
            closeGroupModal();
        }
    });
    
    // 确认添加字段
    confirmAddFieldBtn.addEventListener('click', addField);
    
    // 确认保存分组
    confirmGroupBtn.addEventListener('click', saveGroup);
    
    // 添加行
    addRowBtn.addEventListener('click', addRow);
    
    // 删除选中行
    deleteSelectedBtn.addEventListener('click', deleteSelectedRows);
    
    // 保存数据
    saveBtn.addEventListener('click', saveData);
    
    // 导出数据
    exportBtn.addEventListener('click', exportData);
    
    // 回车键确认添加字段
    newFieldNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addField();
        }
    });
    
    // 回车键确认保存分组
    groupNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            groupStructNameInput.focus();
        }
    });
    
    groupStructNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveGroup();
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
