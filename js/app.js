// 用户身份管理
class IdentityManager {
    constructor() {
        this.identities = new Map();
    }

    // 获取用户身份
    getIdentity(roomId) {
        const key = `${roomId}_identity`;
        let identity = localStorage.getItem(key);
        
        if (!identity) {
            // 生成新身份
            identity = this.generateIdentity(roomId);
            localStorage.setItem(key, JSON.stringify(identity));
        } else {
            identity = JSON.parse(identity);
        }
        
        return identity;
    }

    // 生成随机身份
    generateIdentity(roomId) {
        // 获取房间用户数
        const roomUserCount = parseInt(localStorage.getItem(`${roomId}_count`) || '0') + 1;
        localStorage.setItem(`${roomId}_count`, roomUserCount.toString());
        
        const userNumber = roomUserCount.toString().padStart(2, '0');
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        const avatar = gender === 'male' ? '🔵🐑' : '🌸🐑';
        const color = gender === 'male' ? '#1890FF' : '#FF69B4';
        
        return {
            name: userNumber,
            avatar: avatar,
            gender: gender,
            color: color
        };
    }

    // 清除身份
    clearIdentity(roomId) {
        const key = `${roomId}_identity`;
        localStorage.removeItem(key);
    }
}

// 聊天管理器
class ChatManager {
    constructor() {
        this.identityManager = new IdentityManager();
        this.currentRoom = null;
        this.messages = [];
        this.lastActivity = new Date();
    }

    // 加入聊天室
    joinRoom(roomId, roomName) {
        this.currentRoom = roomId;
        const identity = this.identityManager.getIdentity(roomId);
        
        // 保存房间信息
        sessionStorage.setItem('currentRoom', roomId);
        sessionStorage.setItem('roomName', roomName);
        
        // 显示加入消息
        this.displaySystemMessage(`${identity.avatar} 用户 ${identity.name} 加入了聊天室`);
        
        // 更新活动时间
        this.updateActivity();
        
        return identity;
    }

    // 发送消息
    sendMessage(content) {
        if (!content.trim()) return;
        
        const identity = this.identityManager.getIdentity(this.currentRoom);
        const message = {
            id: Date.now(),
            type: 'message',
            user: identity,
            content: content,
            timestamp: new Date()
        };
        
        // 保存到消息列表
        this.messages.push(message);
        
        // 显示消息
        this.displayUserMessage(message);
        
        // 更新活动时间
        this.updateActivity();
        
        // 保存到本地存储（模拟发送）
        this.saveMessageToStorage(message);
    }

    // 显示用户消息
    displayUserMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        const identity = this.identityManager.getIdentity(this.currentRoom);
        const isOwnMessage = message.user.name === identity.name;
        
        messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
        messageElement.innerHTML = `
            <div class="message-avatar">${message.user.avatar}</div>
            <div class="message-content">
                <div class="message-user" style="color: ${message.user.color}">
                    ${message.user.name} ${message.user.avatar}
                </div>
                <div class="message-bubble">${message.content}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 显示系统消息
    displaySystemMessage(content) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'system-message';
        messageElement.textContent = content;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 更新活动时间
    updateActivity() {
        this.lastActivity = new Date();
        
        // 重置清理计时器
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
        }
        
        // 设置10分钟清理提示
        this.cleanupTimer = setTimeout(() => {
            this.showCleanupWarning();
        }, 8 * 60 * 1000); // 8分钟后显示警告
    }

    // 显示清理警告
    showCleanupWarning() {
        const statusElement = document.getElementById('roomStatus');
        if (statusElement) {
            statusElement.textContent = '2分钟后清理';
            statusElement.style.color = '#ff4d4f';
        }
        
        this.displaySystemMessage('⚠️ 聊天室2分钟后将自动清理');
        
        // 2分钟后刷新页面（模拟清理）
        setTimeout(() => {
            location.reload();
        }, 2 * 60 * 1000);
    }

    // 保存消息到本地存储（模拟功能）
    saveMessageToStorage(message) {
        const key = `${this.currentRoom}_messages`;
        let messages = JSON.parse(localStorage.getItem(key) || '[]');
        messages.push(message);
        localStorage.setItem(key, JSON.stringify(messages));
    }

    // 加载历史消息
    loadHistoryMessages() {
        const key = `${this.currentRoom}_messages`;
        const messages = JSON.parse(localStorage.getItem(key) || '[]');
        
        messages.forEach(message => {
            if (message.type === 'message') {
                this.displayUserMessage(message);
            }
        });
    }
}

// 全局聊天管理器
const chatManager = new ChatManager();

// 页面功能 - 聊天室列表
function initRoomList() {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;
    
    const rooms = [
        { id: 'general', name: '普通聊天室', icon: '🏠', desc: '随便聊聊' },
        { id: 'game', name: '游戏交流室', icon: '🎮', desc: '分享游戏心得' },
        { id: 'emotion', name: '情感树洞室', icon: '💬', desc: '倾诉心声' },
        { id: 'music', name: '音乐分享室', icon: '🎵', desc: '分享好音乐' }
    ];
    
    roomList.innerHTML = '';
    
    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.innerHTML = `
            <div class="room-icon">${room.icon}</div>
            <div class="room-info">
                <h3>${room.name}</h3>
                <p>${room.desc} · <span class="online-count">0</span>人在线 · <span class="status-text">活跃中</span></p >
            </div>
        `;
        roomCard.onclick = () => enterRoom(room.id, room.name);
        roomList.appendChild(roomCard);
    });
}

// 进入聊天室
function enterRoom(roomId, roomName) {
    chatManager.joinRoom(roomId, roomName);
    window.location.href = 'chat.html';
}

// 创建新聊天室
function createNewRoom() {
    const roomId = 'room_' + Date.now();
    const roomName = '新聊天室' + Math.random().toString(36).substr(2, 4);
    enterRoom(roomId, roomName);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 如果是首页，初始化聊天室列表
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/')) {
        initRoomList();
    }
});