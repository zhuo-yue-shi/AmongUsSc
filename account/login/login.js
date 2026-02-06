// 全局配置（将从 u.json 和 k.json 动态加载）
let API_BASE_URL = '';
let API_KEY = '';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
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
        const uResponse = await fetch('https://auoj.ytt11.xyz/play/u.json');
        const uData = await uResponse.json();
        API_BASE_URL = uData.url;
        
        const kResponse = await fetch('https://auoj.ytt11.xyz/play/k.json');
        const kData = await kResponse.json();
        API_KEY = kData.key;
        
        console.log('配置已加载:');
        console.log('API URL:', API_BASE_URL);
    } catch (error) {
        throw new Error('无法加载配置文件');
    }
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
    
    if (!API_BASE_URL) {
        showLoginError('系统API地址未加载，请刷新页面');
        return;
    }
    
    showLoginLoading('正在验证用户信息...');
    
    try {
        // 【核心】直接发送明文密码
        // 后端 app (3).py 的 /token 接口会进行 SHA-256 加密
        const response = await fetch(`${API_BASE_URL}/token?id=${encodeURIComponent(username)}&pw=${encodeURIComponent(password)}`);
        const result = await response.json();
        
        if (result.success) {
            // 登录成功，获取用户详细信息
            const userRes = await fetch(`${API_BASE_URL}/get?id=${encodeURIComponent(username)}`);
            const userData = await userRes.json();
            
            let beans = 0;
            let exp = 0;
            
            if (userData.success && userData.data) {
                beans = userData.data.beans !== undefined ? userData.data.beans : 0;
                exp = userData.data.exp !== undefined ? userData.data.exp : 0;
            }
            
            showLoginInfo(username, beans, exp);

            // 【新增】登录成功后，跳转到自定义协议
            window.open(`auscoj://login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
        } else {
            throw new Error(result.error || '登录失败');
        }
    } catch (error) {
        showLoginError(error.message);
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
    
    document.getElementById('loginForm').reset();
}

// 显示登录错误 (通用错误，包括封禁信息)
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
