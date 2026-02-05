// ==================== 配置 ====================
// 默认配置（如果网络加载失败，将使用这些值）
let API_BASE_URL = 'http://localhost:5000';
// 这里使用了你提供的 Key 作为默认值，防止 k.json 加载失败
let API_KEY = 'kENgC4PpAEeYzLq3CHy4ZmuTGVHDLC';

// ==================== 初始化配置（从网络加载） ====================
async function initConfig() {
    const statusText = document.getElementById('apiStatusText');
    const apiUrlSpan = document.querySelector('.api-url');
    
    if (statusText) statusText.textContent = '正在加载配置...';
    
    try {
        // 1. 加载 API URL
        try {
            console.log('正在获取 API URL: https://auoj.ytt11.xyz/play/u.json');
            const uRes = await fetch('https://auoj.ytt11.xyz/play/u.json');
            if (uRes.ok) {
                const uText = await uRes.text();
                try {
                    const uData = JSON.parse(uText);
                    // 兼容多种可能的字段名：url, u, address, api_url
                    API_BASE_URL = uData.url || uData.u || uData.address || uData.api_url || API_BASE_URL;
                } catch (e) {
                    // 如果返回的不是 JSON 对象，直接当作 URL 字符串使用
                    API_BASE_URL = uText.trim() || API_BASE_URL;
                }
                console.log('✅ API URL 已加载:', API_BASE_URL);
            } else {
                console.warn('⚠️ 获取 u.json 失败:', uRes.status);
            }
        } catch (error) {
            console.warn('⚠️ 加载 API URL 网络错误，使用默认值');
        }

        // 2. 加载 API Key
        try {
            console.log('正在获取 API Key: https://auoj.ytt11.xyz/play/k.json');
            const kRes = await fetch('https://auoj.ytt11.xyz/play/k.json');
            if (kRes.ok) {
                const kText = await kRes.text();
                try {
                    const kData = JSON.parse(kText);
                    // 兼容多种可能的字段名：key, k, api_key
                    API_KEY = kData.key || kData.k || kData.api_key || API_KEY;
                } catch (e) {
                    // 如果返回的不是 JSON 对象，直接当作 Key 字符串使用
                    API_KEY = kText.trim() || API_KEY;
                }
                console.log('✅ API Key 已加载');
            } else {
                console.warn('⚠️ 获取 k.json 失败:', kRes.status);
            }
        } catch (error) {
            console.warn('⚠️ 加载 API Key 网络错误，使用默认值');
        }
    } catch (error) {
        console.error('❌ 配置初始化出错:', error);
    }

    // 更新显示的地址
    if (apiUrlSpan) {
        apiUrlSpan.textContent = API_BASE_URL;
    }
}

// ==================== 页面加载初始化 ====================
document.addEventListener('DOMContentLoaded', async function() {
    // 【核心】首先加载网络配置，并设置超时
    const configTimeout = setTimeout(() => {
        console.warn('⚠️ 配置加载超时，使用默认值');
        // 超时后继续执行，使用默认值
        checkApiStatus();
    }, 5000); // 5秒超时

    try {
        await initConfig();
    } finally {
        // 清除超时
        clearTimeout(configTimeout);
        // 无论配置是否加载成功，都继续执行
        checkApiStatus();
    }
    
    // 绑定表单提交事件
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // 用户名输入时实时检查
    const usernameInput = document.getElementById('username');
    let checkTimeout;
    
    usernameInput.addEventListener('input', function() {
        clearTimeout(checkTimeout);
        const username = this.value.trim();
        
        if (username.length >= 3) {
            // 显示检查中状态
            updateUsernameStatus('正在检查...', 'checking');
            
            checkTimeout = setTimeout(() => {
                checkUsernameAvailability(username);
            }, 500);
        } else {
            updateUsernameStatus('');
        }
    });
    
    // 密码输入时显示强度
    document.getElementById('password').addEventListener('input', function() {
        updatePasswordStrength();
        checkPasswordMatch();
    });
    
    // 确认密码输入时检查匹配
    document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);
    
    // 邮箱输入时验证格式
    document.getElementById('email').addEventListener('input', function() {
        const email = this.value.trim();
        if (email && !validateEmail(email)) {
            this.style.borderColor = 'var(--error-color)';
        } else {
            this.style.borderColor = '';
        }
    });
    
    // 邀请码输入时验证
    document.getElementById('inviteCode').addEventListener('input', function() {
        const inviteCode = this.value.trim();
        if (inviteCode && inviteCode.length < 4) {
            this.style.borderColor = 'var(--warning-color)';
        } else if (inviteCode) {
            this.style.borderColor = 'var(--success-color)';
        } else {
            this.style.borderColor = '';
        }
    });
    
    // 邀请码失去焦点时验证有效性（实时检查）
    document.getElementById('inviteCode').addEventListener('blur', async function() {
        const inviteCode = this.value.trim();
        if (inviteCode && inviteCode.length >= 4) {
            await checkInviteCode(inviteCode);
        }
    });
});

// ==================== API状态检查 ====================
async function checkApiStatus() {
    const statusDot = document.getElementById('apiStatusDot');
    const statusText = document.getElementById('apiStatusText');
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            statusDot.className = 'status-dot online';
            // 显示邀请码数量
            const inviteCount = data.invite_codes_count || 0;
            statusText.textContent = `API在线 | ${data.json_file_count} 用户 | ${inviteCount} 邀请码`;
        } else {
            throw new Error('API响应异常');
        }
    } catch (error) {
        console.error('API检查失败:', error);
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'API离线 - 请检查连接';
    }
}

// ==================== 哈希函数 ====================
function hashPassword(string) {
    let ans = 0;
    for (let i = 0; i < string.length; i++) {
        const add = string.charCodeAt(i);
        
        if (add % 3 === 0) {
            ans += add * (i + 1) * 7;
        } else if (add % 2 === 1) {
            ans += add * (i + 1) * 2;
        } else {
            ans += add * (i + 1) * 5;
        }
    }
    return ans;
}

// ==================== 用户名可用性检查 ====================
async function checkUsernameAvailability(username) {
    if (!username || username.length < 3) {
        updateUsernameStatus('');
        return false;
    }
    
    // 用户名格式检查
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        updateUsernameStatus('只能包含字母、数字、下划线和连字符', 'error');
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/exists?id=${username}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.exists) {
                updateUsernameStatus('用户名已被使用', 'error');
                return false;
            } else {
                updateUsernameStatus('用户名可用', 'success');
                return true;
            }
        } else {
            updateUsernameStatus('检查失败，请重试', 'error');
            return false;
        }
    } catch (error) {
        updateUsernameStatus('网络连接错误', 'error');
        return false;
    }
}

function updateUsernameStatus(message, type = '') {
    const statusElement = document.getElementById('usernameStatus');
    statusElement.textContent = message;
    statusElement.className = 'input-status';
    
    if (type === 'success') {
        statusElement.classList.add('success');
    } else if (type === 'error') {
        statusElement.classList.add('error');
    }
}

// ==================== 邀请码验证（不消耗） ====================
async function checkInviteCode(code) {
    try {
        const response = await fetch(`${API_BASE_URL}/verify_invite_code?code=${code}`);
        const data = await response.json();
        
        if (data.valid) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('邀请码验证失败:', error);
        return false;
    }
}

// ==================== 存储用户数据（已修复 Invalid Value 错误） ====================
async function storeUserData(username, userData) {
    try {
        // 1. 检查参数有效性
        if (!API_BASE_URL) {
            throw new Error("API URL 未设置");
        }
        if (!username || !userData) {
            throw new Error("用户名或数据为空");
        }

        // 2. 准备请求体
        const requestBody = {
            id: username,
            data: userData
        };

        // 3. 发送请求
        const response = await fetch(`${API_BASE_URL}/set`, {
            method: 'POST', // 必须是 POST
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody) // 必须序列化为字符串
        });
        
        // 4. 处理响应
        if (response.ok) {
            const data = await response.json();
            return { success: true, data: data };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.error || 'API请求失败' };
        }
    } catch (error) {
        console.error("storeUserData 详细错误:", error);
        return { success: false, error: error.message };
    }
}

// ==================== 消耗邀请码（已修复 Invalid Value 错误） ====================
async function useInviteCode(code) {
    try {
        if (!API_BASE_URL) {
            throw new Error("API URL 未设置");
        }
        if (!code) {
            throw new Error("邀请码为空");
        }

        // 使用 POST 方法调用，携带 API_KEY
        const response = await fetch(`${API_BASE_URL}/use_invite_code`, {
            method: 'POST', // 必须是 POST
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code }) // 必须序列化为字符串
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            return { success: true, remaining: data.remaining_codes };
        } else {
            return { success: false, error: data.error || '消耗邀请码失败' };
        }
    } catch (error) {
        console.error("useInviteCode 详细错误:", error);
        return { success: false, error: error.message };
    }
}

// ==================== 邮箱验证 ====================
function validateEmail(email) {
    if (!email) return true; // 邮箱可选
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ==================== 密码强度检测 ====================
function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthLabels = document.querySelectorAll('.strength-label');
    
    if (!password) {
        strengthFill.style.width = '0%';
        strengthFill.style.backgroundColor = '#e5e7eb';
        strengthLabels.forEach(label => label.classList.remove('active'));
        return;
    }
    
    let score = 0;
    
    // 长度评分
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    
    // 字符类型评分
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // 计算百分比和颜色
    const percent = Math.min(score, 5) * 20;
    let color;
    
    if (score <= 2) {
        color = '#ef4444';
    } else if (score <= 4) {
        color = '#f59e0b';
    } else {
        color = '#10b981';
    }
    
    // 更新显示
    strengthFill.style.width = `${percent}%`;
    strengthFill.style.backgroundColor = color;
    
    // 激活对应的标签
    strengthLabels.forEach((label, index) => {
        if (index < Math.min(score, 3)) {
            label.classList.add('active');
        } else {
            label.classList.remove('active');
        }
    });
}

// ==================== 密码匹配检查 ====================
function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchElement = document.getElementById('passwordMatch');
    
    if (!confirmPassword) {
        matchElement.textContent = '';
        return;
    }
    
    if (password === confirmPassword) {
        matchElement.textContent = '✓ 密码匹配';
        matchElement.className = 'input-status success';
    } else {
        matchElement.textContent = '✗ 密码不匹配';
        matchElement.className = 'input-status error';
    }
}

// ==================== 处理注册 ====================
async function handleRegister(event) {
    event.preventDefault();
    
    // 获取表单数据
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('email').value.trim();
    const inviteCode = document.getElementById('inviteCode').value.trim();
    
    // 验证输入
    if (!validateInput(username, password, confirmPassword, email, inviteCode)) {
        return;
    }
    
    // 检查用户名是否可用
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
        showResult('用户名不可用，请选择其他用户名', 'error');
        return;
    }
    
    // 检查邀请码是否有效（前端验证）
    const isInviteValid = await checkInviteCode(inviteCode);
    if (!isInviteValid) {
        showResult('邀请码无效或已被使用', 'error');
        return;
    }
    
    // 计算密码哈希
    const passwordHash = hashPassword(password);
    
    // 准备用户数据（包含邀请码）
    const userData = {
        username: username,
        password: passwordHash,
        email: email || "",
        inviteCode: inviteCode,
        head: [],
        exp: 0,
        beans: 100,
        ban: false,
        bantime: false,
        banreason: "", // 【新增】封禁原因，默认为空
        register_time: new Date().toISOString()
    };
    
    // 显示加载状态
    showResult(`
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <h4>正在创建账户...</h4>
            <p>正在存储用户数据到JSON文件</p>
        </div>
    `, 'loading');
    
    disableForm(true);
    
    try {
        // 1. 存储用户数据
        const result = await storeUserData(username, userData);
        
        if (result.success) {
            // 2. 注册成功后，消耗邀请码（后端删除）
            const useResult = await useInviteCode(inviteCode);
            
            if (useResult.success) {
                console.log('✅ 邀请码已消耗，剩余:', useResult.remaining);
            } else {
                console.error('⚠️ 消耗邀请码失败:', useResult.error);
            }
            
            // 显示成功信息（不含任何按钮）
            showResult(`
                <div class="success-state">
                    <div class="success-icon">🎉</div>
                    <h4>账户创建成功！</h4>
                    <div class="success-details">
                        <div class="detail-item">
                            <span class="detail-label">用户名：</span>
                            <span class="detail-value">${username}</span>
                        </div>
                        ${email ? `<div class="detail-item">
                            <span class="detail-label">邮箱：</span>
                            <span class="detail-value">${email}</span>
                        </div>` : ''}
                        <div class="detail-item">
                            <span class="detail-label">邀请码：</span>
                            <span class="detail-value">${inviteCode}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">注册时间：</span>
                            <span class="detail-value">${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `, 'success');
            
            // 重新检查API状态（更新邀请码数量）
            checkApiStatus();
        } else {
            showResult(`
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h4>注册失败</h4>
                    <p>${result.error || '未知错误'}</p>
                </div>
            `, 'error');
        }
    } catch (error) {
        showResult(`
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h4>网络错误</h4>
                <p>${error.message}</p>
            </div>
        `, 'error');
    } finally {
        disableForm(false);
    }
}

// ==================== 验证输入 ====================
function validateInput(username, password, confirmPassword, email, inviteCode) {
    // 验证用户名
    if (username.length < 3 || username.length > 20) {
        showResult('用户名长度必须在3-20个字符之间', 'error');
        return false;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        showResult('用户名只能包含字母、数字、下划线和连字符', 'error');
        return false;
    }
    
    // 验证密码
    if (password.length < 6) {
        showResult('密码长度必须至少6个字符', 'error');
        return false;
    }
    
    // 验证密码匹配
    if (password !== confirmPassword) {
        showResult('两次输入的密码不一致', 'error');
        return false;
    }
    
    // 验证邮箱（如果提供了）
    if (email && !validateEmail(email)) {
        showResult('邮箱格式不正确', 'error');
        return false;
    }
    
    // 验证邀请码
    if (!inviteCode || inviteCode.trim() === '') {
        showResult('请输入邀请码', 'error');
        return false;
    }
    
    if (inviteCode.length < 4) {
        showResult('邀请码格式不正确', 'error');
        return false;
    }
    
    return true;
}

// ==================== 查看用户数据 ====================
async function viewUserData(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/get?id=${username}`);
        
        if (response.ok) {
            const data = await response.json();
            // 确保显示新字段 banreason
            const jsonStr = JSON.stringify({
                username: data.data.username || '',
                password: data.data.password || data.data.password_hash || 0,
                email: data.data.email || '',
                inviteCode: data.data.inviteCode || '',
                head: data.data.head || [],
                exp: data.data.exp || 0,
                beans: data.data.beans || 100,
                banreason: data.data.banreason || '',
                register_time: data.data.register_time || ''
            }, null, 2);
            
            // 显示JSON数据
            showResult(`
                <div class="json-viewer">
                    <h4>${username}.json</h4>
                    <pre>${jsonStr}</pre>
                    <button onclick="closeResult()" class="action-btn clear-btn">
                        关闭
                    </button>
                </div>
            `, 'success');
        } else {
            showResult('获取用户数据失败', 'error');
        }
    } catch (error) {
        showResult('网络错误，无法获取用户数据', 'error');
    }
}

// ==================== 显示结果 ====================
function showResult(content, type) {
    const resultArea = document.getElementById('result');
    
    // 添加结果区域样式
    const style = document.createElement('style');
    style.textContent = `
        .loading-state, .success-state, .error-state {
            text-align: center;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: var(--primary-color);
            border-radius: 50%;
            margin: 0 auto 16px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .success-icon, .error-icon {
            font-size: 3rem;
            margin-bottom: 16px;
            display: block;
        }
        
        .success-details {
            background: rgba(255, 255, 255, 0.5);
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: left;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .detail-item:last-child {
            margin-bottom: 0;
            border-bottom: none;
        }
        
        .detail-label {
            font-weight: 500;
            color: var(--text-secondary);
        }
        
        .detail-value {
            color: var(--text-primary);
        }
        
        .hash-value {
            font-family: 'Courier New', monospace;
            background: rgba(0, 0, 0, 0.05);
            padding: 2px 6px;
            border-radius: 4px;
            cursor: pointer;
            transition: var(--transition);
        }
        
        .hash-value:hover {
            background: rgba(99, 102, 241, 0.1);
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }
        
        .action-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: var(--transition);
        }
        
        .view-btn {
            background: var(--primary-color);
            color: white;
        }
        
        .test-btn {
            background: var(--warning-color);
            color: white;
        }
        
        .clear-btn {
            background: var(--text-secondary);
            color: white;
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);
    
    resultArea.innerHTML = content;
    resultArea.style.display = 'block';
    resultArea.className = 'result-area ' + type;
    
    // 滚动到结果区域
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== 禁用/启用表单 ====================
function disableForm(disabled) {
    const inputs = document.querySelectorAll('#registerForm input');
    const button = document.getElementById('submitBtn');
    
    inputs.forEach(input => {
        input.disabled = disabled;
    });
    
    button.disabled = disabled;
    button.querySelector('.btn-text').textContent = disabled ? '创建中...' : '创建账户';
}

// ==================== 辅助功能 ====================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text.toString())
        .then(() => alert('已复制到剪贴板'))
        .catch(() => alert('复制失败'));
}

function clearForm() {
    document.getElementById('registerForm').reset();
    document.getElementById('usernameStatus').textContent = '';
    document.getElementById('passwordMatch').textContent = '';
    document.getElementById('strengthFill').style.width = '0%';
    document.querySelectorAll('.strength-label').forEach(label => {
        label.classList.remove('active');
    });
    document.getElementById('result').style.display = 'none';
}

function closeResult() {
    document.getElementById('result').style.display = 'none';
}

// ==================== 快捷操作功能 ====================
function showApiTest() {
    const example = `curl -X POST \\
  -H "x-api-key: ${API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "testuser",
    "data": {
      "username": "testuser",
      "password": 123456,
      "email": "test@example.com",
      "inviteCode": "TEST123",
      "head": [],
      "exp": 0,
      "beans": 100,
      "banreason": "",
      "register_time": "${new Date().toISOString()}"
    }
  }' \\
  ${API_BASE_URL}/set`;
    
    showResult(`
        <div class="api-test">
            <h4>🔧 API测试命令</h4>
            <pre>${example}</pre>
            <button onclick="copyToClipboard('${example.replace(/\n/g, '\\n')}')" class="action-btn">
                复制命令
            </button>
        </div>
    `, 'success');
}

async function viewAllUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/list`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const users = data.files || [];
                
                let userList = '<h4>👥 已注册用户</h4><div class="user-list">';
                
                if (users.length === 0) {
                    userList += '<p>暂无用户</p>';
                } else {
                    users.forEach(user => {
                        userList += `
                            <div class="user-item">
                                <span class="user-name">${user.id}</span>
                                <span class="user-size">${(user.size / 1024).toFixed(2)} KB</span>
                                <button onclick="viewUserData('${user.id}')" class="small-btn">查看</button>
                            </div>
                        `;
                    });
                }
                
                userList += '</div>';
                showResult(userList, 'success');
            }
        }
    } catch (error) {
        showResult('获取用户列表失败', 'error');
    }
}

function showHashExample() {
    const hashCode = `function hash(string) {
  let ans = 0;
  for (let i = 0; i < string.length; i++) {
    const add = string.charCodeAt(i);
    if (add % 3 === 0) {
      ans += add * (i + 1) * 7;
    } else if (add % 2 == 1) {
      ans += add * (i + 1) * 2;
    } else {
      ans += add * (i + 1) * 5;
    }
  }
  return ans;
}`;
    
    showResult(`
        <div class="hash-example">
            <h4>🔢 哈希算法</h4>
            <pre>${hashCode}</pre>
            <div class="hash-test">
                <input type="text" id="hashTestInput" placeholder="输入字符串测试哈希">
                <button onclick="testHash()" class="action-btn">计算哈希</button>
                <div id="hashResult"></div>
            </div>
        </div>
    `, 'success');
}

function testHash() {
    const input = document.getElementById('hashTestInput').value;
    if (input) {
        const hashValue = hashPassword(input);
        document.getElementById('hashResult').innerHTML = `
            <div class="hash-result">
                <span>输入: "${input}"</span>
                <span>哈希值: <strong>${hashValue}</strong></span>
            </div>
        `;
    }
}
