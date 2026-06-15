<template>
  <div class="admin-container">
    <div class="card admin-card">
      <div class="card-header">
        <span class="icon">🔐</span>
        <h2>回复审核管理</h2>
      </div>

      <div v-if="!isLoggedIn" class="login-form">
        <p class="login-tip">请输入管理密钥进入审核后台</p>
        <input
          v-model="adminToken"
          type="password"
          class="token-input"
          placeholder="请输入管理密钥"
          @keyup.enter="login"
        />
        <button class="btn btn-primary login-btn" @click="login">
          进入管理
        </button>
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>
      </div>

      <div v-else class="admin-content">
        <div class="admin-header">
          <span class="pending-count">
            待审核回复：<strong>{{ pendingReplies.length }}</strong> 条
          </span>
          <button class="btn btn-secondary refresh-btn" @click="fetchPendingReplies">
            🔄 刷新
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="pendingReplies.length === 0" class="empty-state">
          <span class="empty-icon">🎉</span>
          <p>暂无待审核回复</p>
        </div>

        <div v-else class="reply-list">
          <div
            v-for="reply in pendingReplies"
            :key="reply.id"
            class="reply-card"
          >
            <div class="reply-meta">
              <span class="meta-label">对应秘密：</span>
              <span class="secret-preview">"{{ reply.secretContent }}"</span>
            </div>
            <div class="reply-body">
              <span class="meta-label">回复内容：</span>
              <p class="reply-text">{{ reply.content }}</p>
            </div>
            <div class="reply-actions">
              <button
                class="btn btn-approve"
                @click="approveReply(reply.id)"
                :disabled="processingId === reply.id"
              >
                ✅ 通过
              </button>
              <button
                class="btn btn-reject"
                @click="rejectReply(reply.id)"
                :disabled="processingId === reply.id"
              >
                ❌ 拒绝
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const adminToken = ref('')
const isLoggedIn = ref(false)
const loginError = ref('')
const loading = ref(false)
const pendingReplies = ref([])
const processingId = ref(null)

function login() {
  if (!adminToken.value.trim()) {
    loginError.value = '请输入管理密钥'
    return
  }
  loginError.value = ''
  isLoggedIn.value = true
  fetchPendingReplies()
}

async function fetchPendingReplies() {
  loading.value = true
  try {
    const response = await fetch('/api/admin/replies/pending', {
      headers: {
        'x-admin-token': adminToken.value
      }
    })

    if (response.status === 401) {
      isLoggedIn.value = false
      loginError.value = '管理密钥错误'
      return
    }

    const data = await response.json()
    pendingReplies.value = data.replies || []
  } catch (error) {
    console.error('获取待审核回复失败:', error)
    pendingReplies.value = []
  } finally {
    loading.value = false
  }
}

async function approveReply(id) {
  processingId.value = id
  try {
    const response = await fetch(`/api/admin/replies/${id}/approve`, {
      method: 'PUT',
      headers: {
        'x-admin-token': adminToken.value
      }
    })

    if (response.ok) {
      pendingReplies.value = pendingReplies.value.filter(r => r.id !== id)
    }
  } catch (error) {
    console.error('审核通过失败:', error)
  } finally {
    processingId.value = null
  }
}

async function rejectReply(id) {
  processingId.value = id
  try {
    const response = await fetch(`/api/admin/replies/${id}/reject`, {
      method: 'PUT',
      headers: {
        'x-admin-token': adminToken.value
      }
    })

    if (response.ok) {
      pendingReplies.value = pendingReplies.value.filter(r => r.id !== id)
    }
  } catch (error) {
    console.error('拒绝失败:', error)
  } finally {
    processingId.value = null
  }
}
</script>

<style scoped>
.admin-container {
  width: 100%;
  max-width: 700px;
}

.admin-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.card-header h2 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.login-form {
  text-align: center;
  padding: 20px 0;
}

.login-tip {
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
}

.token-input {
  width: 100%;
  max-width: 300px;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.token-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.login-btn {
  min-width: 150px;
  padding: 12px 30px;
  font-size: 16px;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 16px;
  border-radius: 8px;
  margin-top: 15px;
  font-size: 14px;
  display: inline-block;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.pending-count {
  font-size: 15px;
  color: #666;
}

.pending-count strong {
  color: #f59e0b;
  font-size: 18px;
}

.refresh-btn {
  padding: 8px 16px;
  font-size: 14px;
}

.loading-state {
  text-align: center;
  padding: 50px 20px;
  color: #666;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 56px;
  display: block;
  margin-bottom: 15px;
}

.empty-state p {
  color: #999;
  font-size: 15px;
}

.reply-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 5px;
}

.reply-card {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px;
  transition: all 0.3s ease;
}

.reply-card:hover {
  border-color: #c7d2fe;
  background: #f5f3ff;
}

.reply-meta {
  margin-bottom: 12px;
}

.meta-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.secret-preview {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  line-height: 1.5;
}

.reply-body {
  margin-bottom: 15px;
}

.reply-text {
  margin: 8px 0 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: #333;
  background: white;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.reply-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-approve {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  color: white;
  padding: 8px 20px;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-approve:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-approve:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-reject {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: white;
  padding: 8px 20px;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-reject:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-reject:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
