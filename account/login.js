// 配置
const API_BASE_URL = 'http://103.236.55.217:5000';
const API_KEY = '47xb523hxbh81vhjjcdh885edjhcv';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 绑定登录表单提交事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// 哈希函数（与注册页相同）
function hash(string) {
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

// 处理登录
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showLoginError('请输入用户名和密码');
        return;
    }
    
    showLoginLoading('正在验证用户信息...');
    
    try {
        // 获取用户数据
        const response = await fetch(`${API_BASE_URL}/get?id=user_${username}`);
        
        if (!response.ok) {
            throw new Error('用户不存在');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error('用户不存在');
        }
        
        // 验证密码
        const storedHash = data.data.password_hash;
        const inputHash = hash(password);
        
        if (storedHash === inputHash) {
            // 登录成功，更新最后登录时间
            await updateLastLogin(username);
            
            // 显示用户信息
            showLoginSuccess(data.data);
        } else {
            throw new Error('密码错误');
        }
    } catch (error) {
        showLoginError(error.message);
    }
}

// 更新最后登录时间
async function updateLastLogin(username) {
    try {
        await fetch(`${API_BASE_URL}/set_many`, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: `user_${username}`,
                data: {
                    last_login: new Date().toISOString()
                }
            })
        });
    } catch (error) {
        console.error('更新登录时间失败:', error);
    }
}

// 显示登录加载状态
function showLoginLoading(message) {
    const resultElement = document.getElementById('loginResultContent');
    const container = document.getElementById('loginResult');
    
    resultElement.innerHTML = `
        <div class="loading-container">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p>${message}</p>
        </div>
    `;
    container.style.display = 'block';
}

// 显示登录成功
function showLoginSuccess(userData) {
    const resultElement = document.getElementById('loginResultContent');
    const container = document.getElementById('loginResult');
    
    resultElement.innerHTML = `
        <div class="success-container">
            <h4><i class="fas fa-check-circle"></i> 登录成功！</h4>
            <div class="user-info">
                <p><strong>用户名：</strong> ${userData.username}</p>
                <p><strong>注册时间：</strong> ${new Date(userData.register_time).toLocaleString()}</p>
                <p><strong>最后登录：</strong> ${new Date(userData.last_login).toLocaleString()}</p>
                <p><strong>等级：</strong> ${userData.user_info.level}</p>
                <p><strong>积分：</strong> ${userData.user_info.beans}</p>
                <p><strong>状态：</strong> <span class="badge active">${userData.user_info.status}</span></p>
            </div>
            <div class="actions">
                <button class="btn btn-outline" onclick="viewUserJSON('${userData.username}')">
                    <i class="fas fa-code"></i> 查看JSON数据
                </button>
            </div>
        </div>
    `;
    container.style.display = 'block';
    
    // 清空表单
    document.getElementById('loginForm').reset();
}

// 显示登录错误
function showLoginError(message) {
    const resultElement = document.getElementById('loginResultContent');
    const container = document.getElementById('loginResult');
    
    resultElement.innerHTML = `
        <div class="error-container">
            <h4><i class="fas fa-exclamation-circle"></i> 登录失败</h4>
            <p>${message}</p>
            <div class="actions">
                <button class="btn btn-outline" onclick="hideLoginResult()">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        </div>
    `;
    container.style.display = 'block';
}

// 查看用户JSON数据
async function viewUserJSON(username) {
    try {
        const response = await fetch(`${API_BASE_URL}/get?id=user_${username}`);
        if (response.ok) {
            const data = await response.json();
            const jsonStr = JSON.stringify(data.data, null, 2);
            
            // 在新窗口中显示JSON
            const newWindow = window.open();
            newWindow.document.write(`
                <html>
                <head>
                    <title>${username} 的用户数据</title>
                    <style>
                        body { font-family: monospace; padding: 20px; background: #2c3e50; color: #ecf0f1; }
                        pre { background: #34495e; padding: 20px; border-radius: 10px; }
                    </style>
                </head>
                <body>
                    <h1>${username} 的用户数据 (user_${username}.json)</h1>
                    <pre>${jsonStr}</pre>
                </body>
                </html>
            `);
        }
    } catch (error) {
        alert('获取JSON数据失败');
    }
}

// 隐藏登录结果
function hideLoginResult() {
    document.getElementById('loginResult').style.display = 'none';
}