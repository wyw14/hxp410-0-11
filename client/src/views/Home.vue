<template>
  <div class="home-container">
    <div class="card secret-card">
      <div class="card-header">
        <span class="icon">💫</span>
        <h2>今日被宽恕的秘密</h2>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在寻找一段温暖的秘密...</p>
      </div>

      <div v-else-if="!hasSecret" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ message }}</p>
        <button class="btn btn-primary" @click="goToConfess">
          分享第一个秘密
        </button>
      </div>

      <transition name="fade" v-else>
        <div class="secret-content" :key="secret?.id">
          <p class="secret-text">"{{ secret.content }}"</p>
          <div class="secret-footer">
            <span class="status-badge">{{ secret.status }}</span>
            <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret">
              🔄 换一个
            </button>
          </div>

          <div class="replies-section">
            <div class="replies-header">
              <span class="replies-title">💜 温暖回复</span>
              <span class="replies-count">{{ replies.length }} 条</span>
            </div>

            <div v-if="loadingReplies" class="replies-loading">
              加载回复中...
            </div>

            <div v-else-if="replies.length === 0" class="replies-empty">
              还没有回复，成为第一个送上温暖的人吧
            </div>

            <div v-else class="replies-list">
              <div
                v-for="reply in replies"
                :key="reply.id"
                class="reply-item"
              >
                <p class="reply-content">{{ reply.content }}</p>
              </div>
            </div>
          </div>

          <div class="reply-form">
            <textarea
              v-model="replyContent"
              class="reply-input"
              placeholder="留下一句温暖的话..."
              rows="3"
              :disabled="submittingReply"
              maxlength="200"
            ></textarea>
            <div class="reply-form-footer">
              <span class="char-count">{{ replyContent.length }}/200</span>
              <button
                class="btn btn-primary reply-submit-btn"
                @click="submitReply"
                :disabled="submittingReply || !replyContent.trim()"
              >
                <span v-if="submittingReply">提交中...</span>
                <span v-else>💝 送出安慰</span>
              </button>
            </div>
            <div v-if="replySuccess" class="reply-success">
              ✨ 你的回复已提交，审核通过后将会展示
            </div>
            <div v-if="replyError" class="reply-error">
              {{ replyError }}
            </div>
          </div>
        </div>
      </transition>

      <div class="card-actions">
        <button class="btn btn-primary" @click="goToConfess">
          我也想倾诉
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const hasSecret = ref(false)
const secret = ref(null)
const message = ref('')
const replies = ref([])
const loadingReplies = ref(false)
const replyContent = ref('')
const submittingReply = ref(false)
const replySuccess = ref(false)
const replyError = ref('')

async function fetchRandomSecret() {
  loading.value = true
  replies.value = []
  replyContent.value = ''
  replySuccess.value = false
  replyError.value = ''
  try {
    const response = await fetch('/api/secrets/random')
    const data = await response.json()
    hasSecret.value = data.hasSecret
    secret.value = data.secret
    message.value = data.message
  } catch (error) {
    console.error('获取秘密失败:', error)
    hasSecret.value = false
    message.value = '暂时无法连接到服务器'
  } finally {
    loading.value = false
  }
}

async function fetchReplies(secretId) {
  if (!secretId) return
  loadingReplies.value = true
  try {
    const response = await fetch(`/api/secrets/${secretId}/replies`)
    const data = await response.json()
    replies.value = data.replies || []
  } catch (error) {
    console.error('获取回复失败:', error)
    replies.value = []
  } finally {
    loadingReplies.value = false
  }
}

async function submitReply() {
  if (!replyContent.value.trim() || !secret.value) return

  submittingReply.value = true
  replySuccess.value = false
  replyError.value = ''

  try {
    const response = await fetch('/api/replies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        secretId: secret.value.id,
        content: replyContent.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      replySuccess.value = true
      replyContent.value = ''
      setTimeout(() => {
        replySuccess.value = false
      }, 3000)
    } else {
      replyError.value = data.error || '提交失败，请稍后重试'
    }
  } catch (err) {
    console.error('提交回复失败:', err)
    replyError.value = '无法连接到服务器，请稍后重试'
  } finally {
    submittingReply.value = false
  }
}

function goToConfess() {
  router.push('/confess')
}

watch(() => secret.value, (newSecret) => {
  if (newSecret && newSecret.id) {
    fetchReplies(newSecret.id)
  }
})

onMounted(() => {
  fetchRandomSecret()
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 600px;
}

.secret-card {
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

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
}

.secret-content {
  padding: 20px 0;
}

.secret-text {
  font-size: 20px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.secret-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.status-badge {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.refresh-btn {
  padding: 8px 20px;
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.replies-section {
  margin-top: 30px;
  padding-top: 25px;
  border-top: 1px dashed #e0e0e0;
}

.replies-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.replies-title {
  font-size: 16px;
  font-weight: 600;
  color: #555;
}

.replies-count {
  font-size: 13px;
  color: #999;
}

.replies-loading,
.replies-empty {
  text-align: center;
  padding: 20px;
  color: #aaa;
  font-size: 14px;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reply-item {
  background: linear-gradient(135deg, #fef3f8 0%, #f3e8ff 100%);
  padding: 12px 16px;
  border-radius: 12px;
  border-left: 3px solid #c084fc;
}

.reply-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
}

.reply-form {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px dashed #e0e0e0;
}

.reply-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.6;
  background: #fafafa;
  box-sizing: border-box;
}

.reply-input:focus {
  outline: none;
  border-color: #c084fc;
  background: white;
  box-shadow: 0 0 0 4px rgba(192, 132, 252, 0.1);
}

.reply-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reply-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.char-count {
  font-size: 12px;
  color: #999;
}

.reply-submit-btn {
  padding: 8px 20px;
  font-size: 14px;
  background: linear-gradient(135deg, #c084fc 0%, #a855f7 100%);
}

.reply-success {
  margin-top: 12px;
  padding: 10px 14px;
  background: #ecfdf5;
  color: #059669;
  border-radius: 8px;
  font-size: 13px;
  border-left: 3px solid #10b981;
}

.reply-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
  border-left: 3px solid #ef4444;
}

.card-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
}
</style>
