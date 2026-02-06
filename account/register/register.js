// ==================== 配置 ====================
// 默认配置（如果网络加载失败，将使用这些值）
let API_BASE_URL = 'http://localhost:5000';
let API_KEY = 'kENgC4PpAEeYzLq3CHy4ZmuTGVHDLC';

// ==================== SHA-256 哈希函数（前端加密） ====================
async function sha256Encrypt(string) {
    const msgBuffer = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

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
                    API_BASE_URL = uData.url || uData.u || uData.address || uData.api_url || API_BASE_URL;
                } catch (e) {
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
                    API_KEY = kData.key || kData.k || kData.api_key || API_KEY;
                } catch (e) {
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

    if (apiUrlSpan) {
        apiUrlSpan.textContent = API_BASE_URL;
    }
}

// ==================== 页面加载初始化 ====================
document.addEventListener('DOMContentLoaded', async function() {
    const configTimeout = setTimeout(() => {
        console.warn('⚠️ 配置加载超时，使用默认值');
        checkApiStatus();
    }, 5000);

    try {
        await initConfig();
    } finally {
        clearTimeout(configTimeout);
        checkApiStatus();
    }
    
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // 用户名检查
    const usernameInput = document.getElementById('username');
    let checkTimeout;
    usernameInput.addEventListener('input', function() {
        clearTimeout(checkTimeout);
        const username = this.value.trim();
        if (username.length >= 3) {
            updateUsernameStatus('正在检查...', 'checking');
            checkTimeout = setTimeout(() => checkUsernameAvailability(username), 500);
        } else {
            updateUsernameStatus('');
        }
    });
    
    // 密码强度 & 匹配
    document.getElementById('password').addEventListener('input', () => { updatePasswordStrength(); checkPasswordMatch(); });
    document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);
    
    // 邮箱验证
    document.getElementById('email').addEventListener('input', function() {
        const email = this.value.trim();
        if (email && !validateEmail(email)) {
            this.style.borderColor = 'var(--error-color)';
        } else {
            this.style.borderColor = '';
        }
    });
    
    // 邀请码输入
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

// ==================== 用户名可用性检查 ====================
async function checkUsernameAvailability(username) {
    if (!username || username.length < 3) {
        updateUsernameStatus('');
        return false;
    }
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
    if (type === 'success') statusElement.classList.add('success');
    else if (type === 'error') statusElement.classList.add('error');
}

// ==================== 邀请码验证（不消耗） ====================
async function checkInviteCode(code) {
    try {
        const response = await fetch(`${API_BASE_URL}/verify_invite_code?code=${code}`);
        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('邀请码验证失败:', error);
        return false;
    }
}

// ==================== 邮箱验证 ====================
function validateEmail(email) {
    if (!email) return true;
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
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    const percent = Math.min(score, 5) * 20;
    let color = score <= 2 ? '#ef4444' : (score <= 4 ? '#f59e0b' : '#10b981');
    
    strengthFill.style.width = `${percent}%`;
    strengthFill.style.backgroundColor = color;
    
    strengthLabels.forEach((label, index) => {
        if (index < Math.min(score, 3)) label.classList.add('active');
        else label.classList.remove('active');
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
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const email = document.getElementById('email').value.trim();
    const inviteCode = document.getElementById('inviteCode').value.trim();
    
    if (!validateInput(username, password, confirmPassword, email, inviteCode)) return;
    
    const isAvailable = await checkUsernameAvailability(username);
    if (!isAvailable) {
        showResult('用户名不可用，请选择其他用户名', 'error');
        return;
    }
    
    const isInviteValid = await checkInviteCode(inviteCode);
    if (!isInviteValid) {
        showResult('邀请码无效或已被使用', 'error');
        return;
    }
    
    // 【核心】前端先进行一次 SHA-256 加密
    const passwordHash = await sha256Encrypt(password);
    console.log('前端加密后的密码(第一层):', passwordHash);
    
    showResult(`
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <h4>正在创建账户...</h4>
            <p>正在提交注册请求（双重加密）</p>
        </div>
    `, 'loading');
    
    disableForm(true);
    
    try {
        // 发送第一层加密后的密码
        // 后端 app (3).py 的 /register 接口会自动再进行一次 SHA-256 加密（第二层）
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: username,
                pw: passwordHash, // 发送的是第一层哈希
                invitecode: inviteCode,
                email: email
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const initialInfo = result.initial_info || { beans: 0, exp: 0 };
            
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
                            <span class="detail-label">初始豆子：</span>
                            <span class="detail-value">${initialInfo.beans}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">初始经验：</span>
                            <span class="detail-value">${initialInfo.exp}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">注册时间：</span>
                            <span class="detail-value">${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `, 'success');
            
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
    if (username.length < 3 || username.length > 20) {
        showResult('用户名长度必须在3-20个字符之间', 'error');
        return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        showResult('用户名只能包含字母、数字、下划线和连字符', 'error');
        return false;
    }
    if (password.length < 6) {
        showResult('密码长度必须至少6个字符', 'error');
        return false;
    }
    if (password !== confirmPassword) {
        showResult('两次输入的密码不一致', 'error');
        return false;
    }
    if (email && !validateEmail(email)) {
        showResult('邮箱格式不正确', 'error');
        return false;
    }
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

// ==================== 显示结果 ====================
function showResult(content, type) {
    const resultArea = document.getElementById('result');
    const style = document.createElement('style');
    style.textContent = `
        .loading-state, .success-state, .error-state { text-align: center; }
        .loading-spinner {
            width: 40px; height: 40px; border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: var(--primary-color); border-radius: 50%;
            margin: 0 auto 16px; animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .success-icon, .error-icon { font-size: 3rem; margin-bottom: 16px; display: block; }
        .success-details {
            background: rgba(255, 255, 255, 0.5); border-radius: 8px; padding: 16px;
            margin: 20px 0; text-align: left;
        }
        .detail-item {
            display: flex; justify-content: space-between; margin-bottom: 8px;
            padding-bottom: 8px; border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .detail-item:last-child { margin-bottom: 0; border-bottom: none; }
        .detail-label { font-weight: 500; color: var(--text-secondary); }
        .detail-value { color: var(--text-primary); }
    `;
    document.head.appendChild(style);
    
    resultArea.innerHTML = content;
    resultArea.style.display = 'block';
    resultArea.className = 'result-area ' + type;
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== 禁用/启用表单 ====================
function disableForm(disabled) {
    const inputs = document.querySelectorAll('#registerForm input');
    const button = document.getElementById('submitBtn');
    inputs.forEach(input => input.disabled = disabled);
    button.disabled = disabled;
    button.querySelector('.btn-text').textContent = disabled ? '创建中...' : '创建账户';
}
