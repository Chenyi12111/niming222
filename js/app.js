// LeanCloud 配置
const APP_ID = 'wanb2m8WLDHjpn2f6i8RY70n-MdYXbMMI';
const APP_KEY = '9Aeas2PrP2Vsl1zeiZ5pXx0y';
const SERVER_URL = 'https://wanb2m8w.api.lncldglobal.com';

// 初始化 LeanCloud
AV.init({
    appId: APP_ID,
    appKey: APP_KEY,
    serverURL: SERVER_URL
});

// 用户身份管理
class IdentityManager {
    constructor() {
        this.identities = new Map();
    }

    async getIdentity(roomId, userId) {
        const key = `${roomId}_${userId}`;
        
        if (this.identities.has(key)) {
            return this.identities.get(key);
        }
        
        return await this.generateIdentityFromLeanCloud(roomId, userId);
    }

    async generateIdentityFromLeanCloud(roomId, userId) {
        try {
            // 使用 LeanCloud 的计数器功能
            const RoomCounter = AV.Object.extend('RoomCounter');
            const query = new AV.Query('RoomCounter');
            query.equalTo('roomId', roomId);
            
            let counter = await query.first();
            if (!counter) {
                counter = new RoomCounter();
                counter.set('roomId', roomId);
                counter.set('count', 0);
            }
            
            // 原子增加计数器
            counter.increment('count', 1);
            await counter.save();
            
            const userCount = counter.get('count');
            const userNumber = userCount.toString().padStart(2, '0');
            const gender = Math.random() > 0.5 ? 'male' : 'female';
            const avatar = gender === 'male' ? '🔵🐑' : '🌸🐑';
            const color = gender === 'male' ? '#1890FF' : '#FF69B4';
            
            const identity = {
                name: userNumber,
                avatar: avatar,
                gender: gender,
                color: color,
                userId: userId
            };
            
            this.identities.set(`${roomId}_${userId}`, identity);
            return identity;
        } catch (error) {
            console.error('生成身份失败:', error);
            return this.generateFallbackIdentity();
        }
    }

    generateFallbackIdentity() {
        const userNumber = Math.floor(Math.random() * 99 + 1).toString().padStart(2, '0');
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        const avatar = gender === 'male' ? '🔵🐑' : '🌸🐑';
        const color = gender === 'male' ? '#1890FF' : '#FF69B4';
        
        return {
            name: userNumber,
            avatar: avatar,
            gender: gender,
            color: color,
            userId: 'fallback_' + Date.now()
        };
    }
}

// 聊天管理器 - 使用 LeanCloud 实时通信
class ChatManager {
    constructor() {
        this.identityManager = new IdentityManager();
        this.currentRoom = null;
        this.userId = this.generateUserId();
        this.lastActivity = new Date();
        this.messageQuery = null;
    }

    generateUserId() {
        let userId = localStorage.getItem('anonymous_chat_userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('anonymous_chat_userId', userId);
        }
        return userId;
    }

    // 加入聊天室
    async joinRoom(roomId, roomName) {
        this.currentRoom = roomId;
        const identity = await this.identityManager.getIdentity(roomId, this.userId);
        
        // 保存房间信息
        sessionStorage.setItem('currentRoom', roomId);
        sessionStorage.setItem('roomName', roomName);
        
        // 设置消息监听
        await this.setupMessageListener(roomId);
        
        // 发送加入通知
        await this.sendSystemMessage(`${identity.avatar} 用户 ${identity.name} 加入了聊天室`);
        
        // 更新活动时间
        this.updateActivity();
        
        return identity;
    }

    // 设置消息监听器
    async setupMessageListener(roomId) {
        // 创建消息查询
        const Message = AV.Object.extend('Message');
        this.messageQuery = new AV.Query('Message');
        this.messageQuery.equalTo('roomId', roomId);
        this.messageQuery.addDescending('createdAt');
        this.messageQuery.limit(50);
        
        // 先加载历史消息
        const historyMessages = await this.messageQuery.find();
        historyMessages.reverse().forEach(message => {
            this.displayMessage(message.toJSON());
        });
        
        // 实时监听新消息
        this.messageQuery.subscribe().then((subscription) => {
            subscription.on('create', (message) => {
                this.displayMessage(message.toJSON());
            });
        });
    }

    // 发送消息
    async sendMessage(content) {
        if (!content.trim()) return;
        
        const identity = await this.identityManager.getIdentity(this.currentRoom, this.userId);
        
        // 创建 Message 对象
        const Message = AV.Object.extend('Message');
        const message = new Message();
        
        message.set('type', 'message');
        message.set('roomId', this.currentRoom);
        message.set('user', identity);
        message.set('content', content);
        message.set('timestamp', new Date());
        
        await message.save();
        
        // 更新活动时间
        this.updateActivity();
    }

    // 发送系统消息
    async sendSystemMessage(content) {
        const Message = AV.Object.extend('Message');
        const message = new Message();
        
        message.set('type', 'system');
        message.set('roomId', this.currentRoom);
        message.set('content', content);
        message.set('timestamp', new Date());
        
        await message.save();
    }

    // 显示消息
    displayMessage(messageData) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        if (messageData.type === 'system') {
            this.displaySystemMessage(messageData.content);
        } else {
            this.displayUserMessage(messageData);
        }
        
        // 自动滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 显示用户消息
    displayUserMessage(messageData) {
        const messagesContainer = document.getElementById('messagesContainer');
        const identity = this.identityManager.getIdentity(this.currentRoom, this.userId);
        const isOwnMessage = messageData.user.userId === this.userId;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwnMessage ? 'own' : ''}`;
        messageElement.innerHTML = `
            <div class="message-avatar">${messageData.user.avatar}</div>
            <div class="message-content">
                <div class="message-user" style="color: ${messageData.user.color}">
                    ${messageData.user.name} ${messageData.user.avatar}
                </div>
                <div class="message-bubble">${messageData.content}</div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
    }

    // 显示系统消息
    displaySystemMessage(content) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = 'system-message';
        messageElement.textContent = content;
        messagesContainer.appendChild(messageElement);
    }

    // 更新活动时间
    updateActivity() {
        this.lastActivity = new Date();
        
        // 重置清理计时器
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
        }
        
        // 设置自动清理（10分钟无人说话）
        this.cleanupTimer = setTimeout(() => {
            this.cleanupRoom();
        }, 10 * 60 * 1000);
    }

    // 清理房间
    async cleanupRoom() {
        if (!this.currentRoom) return;
        
        // 从 LeanCloud 删除所有消息
        const Message = AV.Object.extend('Message');
        const query = new AV.Query('Message');
        query.equalTo('roomId', this.currentRoom);
        
        const messages = await query.find();
        await AV.Object.destroyAll(messages);
        
        // 显示清理消息
        this.displaySystemMessage('🗑️ 聊天室因10分钟无活动已自动清理');
        
        // 重置状态
        const statusElement = document.getElementById('roomStatus');
        if (statusElement) {
            statusElement.textContent = '已清理';
            statusElement.style.color = '#ff4d4f';
        }
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
                <p>${room.desc} · <span class="online-count">0</span>人在线 · <span class="status-text">活跃中</span></p>
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
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/')) {
        initRoomList();
    }
});

