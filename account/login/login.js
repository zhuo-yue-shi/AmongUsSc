// 全局配置（将从 u.json 和 k.json 动态加载）
let API_BASE_URL = '';
let API_KEY = '';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 加载配置并绑定事件
    loadConfig().then(() => {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }).catch(error => {
        console.error('配置加载失败:', error);
        alert('配置加载失败，请刷新页面重试');
    });
});

// 加载配置
async function loadConfig() {
    try {
        // 加载 API URL
        const uResponse = await fetch('https://auoj.ytt11.xyz/play/u.json');
        const uData = await uResponse.json();
        API_BASE_URL = uData.url;
        
        // 加载 API Key
        const kResponse = await fetch('https://auoj.ytt11.xyz/play/k.json');
        const kData = await kResponse.json();
        API_KEY = kData.key;
        
        console.log('配置已加载:');
        console.log('API URL:', API_BASE_URL);
        console.log('API Key:', API_KEY ? '已加载' : '未找到');
    } catch (error) {
        throw new Error('无法加载配置文件');
    }
}

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
    
    if (!API_BASE_URL || !API_KEY) {
        showLoginError('系统配置未加载，请刷新页面');
        return;
    }
    
    showLoginLoading('正在验证用户信息...');
    
    try {
        // 获取用户数据 (不使用 user_ 前缀)
        const response = await fetch(`${API_BASE_URL}/get?id=${username}`);
        
        if (!response.ok) {
            throw new Error('用户不存在');
        }
        
        const res = await response.json();
        
        if (!res.success) {
            throw new Error('用户不存在');
        }
        
        // 获取实际的数据负载
        let userData = res.data;

        // 兼容处理：如果 data 是数组（老数据），取第一个元素；如果是对象（新数据），直接使用
        if (Array.isArray(userData)) {
            if (userData.length > 0) {
                userData = userData[0];
            } else {
                throw new Error('用户数据为空');
            }
        }

        // 验证密码 (注意：JSON中字段名为 password，不是 password_hash)
        const storedHash = userData.password;
        const inputHash = hash(password);
        
        if (storedHash === inputHash) {
            // --- 封禁检测逻辑 ---
            const bantime = userData.bantime;
            let isBanned = false;
            let banMessage = "您的帐户已被封禁";

            // 1. 检查永久封禁 (true 或 "true")
            if (bantime === true || bantime === "true") {
                isBanned = true;
                banMessage = "您的账户已被永久封禁";
            } 
            // 2. 检查未封禁 (false 或 "false")
            else if (bantime === false || bantime === "false") {
                isBanned = false;
            } 
            // 3. 检查时间戳
            else {
                const unbanDate = new Date(bantime);
                const now = new Date();

                // 如果是有效日期
                if (!isNaN(unbanDate.getTime())) {
                    if (unbanDate > now) {
                        // 当前时间小于解封时间 -> 仍在封禁中
                        isBanned = true;
                        const diffMs = unbanDate - now;
                        const diffMins = Math.ceil(diffMs / 1000 / 60); // 计算分钟数
                        banMessage = `您的账户已被封禁，距离解封还有 ${diffMins} 分钟`;
                    } else {
                        // 时间已过 -> 解封
                        isBanned = false;
                    }
                } else {
                    // bantime 格式无法识别，回退检查 'ban' 字段以防万一
                    if (userData.ban === true || userData.ban === "true") {
                        isBanned = true;
                        banMessage = "您的帐户已被封禁";
                    }
                }
            }

            if (isBanned) {
                // 【修改】获取封禁原因并传递给显示函数
                const banReason = userData.banreason || "";
                showBannedMessage(banMessage, banReason);
            } else {
                // 正常登录，显示账户信息
                const beans = userData.beans !== undefined ? userData.beans : 0;
                const exp = userData.exp !== undefined ? userData.exp : 0;
                
                showLoginInfo(userData.username, beans, exp);
                await updateLastLogin(username);
            }
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
                id: `${username}`,
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

// 显示账户信息 (正常登录)
function showLoginInfo(username, beans, exp) {
    const resultElement = document.getElementById('loginResultContent');
    const container = document.getElementById('loginResult');
    
    resultElement.innerHTML = `
        <div class="success-container">
            <h4><i class="fas fa-check-circle"></i> 登录成功</h4>
            <div class="user-info">
                <p><strong>用户名：</strong> ${username}</p>
                <p><strong>豆子：</strong> ${beans}</p>
                <p><strong>经验：</strong> ${exp}</p>
            </div>
        </div>
    `;
    container.style.display = 'block';
    
    // 清空表单
    document.getElementById('loginForm').reset();
}

// 【修改】显示封禁消息 - 增加封禁原因显示
function showBannedMessage(message, reason) {
    const resultElement = document.getElementById('loginResultContent');
    const container = document.getElementById('loginResult');
    
    // 如果有原因，额外生成一行显示
    const reasonHtml = reason ? `<p style="margin-top: 8px;"><strong>封禁原因：</strong>${reason}</p>` : '';

    resultElement.innerHTML = `
        <div class="error-container">
            <h4><i class="fas fa-exclamation-circle"></i> 无法登录</h4>
            <p>${message}</p>
            ${reasonHtml}
            <div class="actions">
                <button class="btn btn-outline" onclick="hideLoginResult()">
                    <i class="fas fa-redo"></i> 返回
                </button>
            </div>
        </div>
    `;
    container.style.display = 'block';
    
    // 清空表单
    document.getElementById('loginForm').reset();
}

// 显示登录错误 (通用错误，如密码错误)
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

// 隐藏登录结果
function hideLoginResult() {
    document.getElementById('loginResult').style.display = 'none';
}
