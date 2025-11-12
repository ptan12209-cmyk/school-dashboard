/**
 * AI Service with Google Gemini
 * ==============================
 * Handles all AI-related operations using Google Gemini API
 */

const axios = require('axios');
const { geminiConfig } = require('../config/ai');

class AIService {
  constructor() {
    this.apiKey = geminiConfig.apiKey;
    this.apiUrl = geminiConfig.apiUrl;
    this.model = geminiConfig.model;
    this.conversationHistory = new Map(); // Store per-user conversation history

    // ✅ SECURITY FIX: Add TTL and max size to prevent memory leak
    this.MAX_HISTORY_SIZE = 1000; // Maximum number of users to store
    this.HISTORY_TTL = 3600000; // 1 hour in milliseconds

    // Cleanup old history every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanupHistory(), 600000);
  }

  /**
   * Call Gemini API with retry logic
   * @param {string} prompt - User prompt
   * @param {Array} history - Optional conversation history
   * @param {number} retries - Number of retries left
   * @returns {Promise<string>} AI response
   */
  async callGemini(prompt, history = [], retries = 2) {
    try {
      // ✅ FIX: Check if API key is configured
      if (!this.apiKey || this.apiKey === '') {
        console.warn('⚠️  Gemini API key not configured');
        return this.getFallbackResponse(prompt);
      }

      // Build contents array for Gemini API
      const contents = [];

      // Add conversation history
      history.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });

      // Add current prompt
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const url = `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

      const response = await axios.post(
        url,
        {
          contents: contents,
          generationConfig: {
            temperature: geminiConfig.temperature,
            maxOutputTokens: geminiConfig.maxTokens,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: geminiConfig.timeout
        }
      );

      // Extract text from Gemini response
      const text = response.data.candidates[0]?.content?.parts[0]?.text;

      if (!text) {
        throw new Error('No response from Gemini');
      }

      return text;
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);

      // ✅ FIX: Retry on timeout or network errors
      if (retries > 0 && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
        console.log(`⚠️  Timeout, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        return this.callGemini(prompt, history, retries - 1);
      }

      if (error.response?.status === 429) {
        return 'Xin lỗi, hệ thống AI đang quá tải. Vui lòng thử lại sau vài phút. 🙏';
      }

      if (error.response?.status === 400) {
        return 'Xin lỗi, câu hỏi của bạn không hợp lệ. Vui lòng thử lại với câu hỏi khác.';
      }

      // ✅ FIX: Return fallback response instead of throwing error
      console.warn('⚠️  Gemini API failed, using fallback response');
      return this.getFallbackResponse(prompt);
    }
  }

  /**
   * Get fallback response when API is unavailable
   * @param {string} prompt - User prompt
   * @returns {string} Fallback response
   */
  getFallbackResponse(prompt) {
    const lowercasePrompt = prompt.toLowerCase();

    // Context-aware fallback responses
    if (lowercasePrompt.includes('điểm') || lowercasePrompt.includes('grade')) {
      return 'Xin lỗi, tôi hiện không thể truy cập dữ liệu điểm. Vui lòng kiểm tra trang Điểm số để xem chi tiết.';
    }

    if (lowercasePrompt.includes('điểm danh') || lowercasePrompt.includes('attendance')) {
      return 'Xin lỗi, tôi hiện không thể truy cập dữ liệu điểm danh. Vui lòng kiểm tra trang Điểm danh để xem chi tiết.';
    }

    if (lowercasePrompt.includes('bài tập') || lowercasePrompt.includes('assignment')) {
      return 'Xin lỗi, tôi hiện không thể truy cập dữ liệu bài tập. Vui lòng kiểm tra trang Bài tập để xem chi tiết.';
    }

    // Generic fallback
    return 'Xin lỗi, AI assistant hiện đang không khả dụng do lỗi kết nối hoặc API key chưa được cấu hình. Vui lòng liên hệ quản trị viên hoặc thử lại sau. 🙏\n\nBạn có thể tiếp tục sử dụng các tính năng khác của hệ thống.';
  }

  /**
   * Chat with AI Assistant
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @param {string} context - Additional context (role, student data, etc.)
   * @returns {Promise<string>} AI response
   */
  async chat(userId, message, context = {}) {
    try {
      // ✅ SECURITY FIX: Check if history exists and is not expired
      const historyEntry = this.conversationHistory.get(userId);
      let history = [];

      if (historyEntry) {
        const age = Date.now() - historyEntry.lastAccess;
        if (age < this.HISTORY_TTL) {
          history = historyEntry.messages;
        } else {
          // Expired, remove
          this.conversationHistory.delete(userId);
        }
      }

      // Build system prompt based on context
      const systemPrompt = this.buildSystemPrompt(context);

      // Combine system prompt with user message
      const fullPrompt = `${systemPrompt}\n\nUser: ${message}\nAssistant:`;

      // Call Gemini with history
      const aiResponse = await this.callGemini(fullPrompt, history.slice(-10));

      // Update conversation history
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: aiResponse });

      // Keep only last 20 messages
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // ✅ Store with timestamp
      this.conversationHistory.set(userId, {
        messages: history,
        lastAccess: Date.now()
      });

      // ✅ Enforce max size to prevent unbounded growth
      if (this.conversationHistory.size > this.MAX_HISTORY_SIZE) {
        this.evictOldest();
      }

      return aiResponse;
    } catch (error) {
      console.error('AI Chat Error:', error.message);
      throw error;
    }
  }

  /**
   * Clear conversation history for a user
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }

  /**
   * ✅ SECURITY FIX: Cleanup expired history entries
   */
  cleanupHistory() {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, entry] of this.conversationHistory.entries()) {
      if (now - entry.lastAccess > this.HISTORY_TTL) {
        this.conversationHistory.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired chat history entries`);
    }
  }

  /**
   * ✅ SECURITY FIX: Evict oldest entry when max size is reached
   */
  evictOldest() {
    // Find and remove the oldest entry
    let oldestUserId = null;
    let oldestTime = Infinity;

    for (const [userId, entry] of this.conversationHistory.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestUserId = userId;
      }
    }

    if (oldestUserId) {
      this.conversationHistory.delete(oldestUserId);
      console.log(`🧹 Evicted oldest chat history for user: ${oldestUserId}`);
    }
  }

  /**
   * Build system prompt based on user context
   */
  buildSystemPrompt(context) {
    const { role, name, language = 'Vietnamese' } = context;

    let prompt = `Bạn là trợ lý AI thông minh cho hệ thống quản lý giáo dục.
Luôn trả lời bằng tiếng ${language}.`;

    if (role === 'student') {
      prompt += `\n\nBạn đang giúp đỡ học sinh tên ${name || 'Học sinh'}.
Vai trò của bạn:
- Trả lời câu hỏi về bài tập, khóa học và điểm số
- Cung cấp mẹo học tập và chiến lược học hiệu quả
- Giúp đỡ với bài tập và ôn thi
- Động viên và khuyến khích học tập
- Giải thích khái niệm một cách đơn giản, dễ hiểu`;
    } else if (role === 'teacher') {
      prompt += `\n\nBạn đang hỗ trợ giáo viên tên ${name || 'Giáo viên'}.
Vai trò của bạn:
- Giúp lập kế hoạch bài giảng và thiết kế chương trình
- Đề xuất phương pháp giảng dạy và đánh giá
- Cung cấp thông tin về hiệu suất học sinh
- Hỗ trợ chấm điểm và phản hồi
- Gợi ý tài liệu giáo dục`;
    } else if (role === 'admin') {
      prompt += `\n\nBạn đang hỗ trợ quản trị viên trường học.
Vai trò của bạn:
- Cung cấp thông tin về chỉ số hiệu suất trường
- Đề xuất cải thiện chương trình học tập
- Giúp đỡ với chính sách và ra quyết định
- Phân tích xu hướng và mẫu hình
- Tạo báo cáo và tóm tắt`;
    }

    prompt += `\n\nHãy hữu ích, thân thiện và chuyên nghiệp. Nếu bạn không biết điều gì, hãy thừa nhận một cách trung thực.`;

    return prompt;
  }

  /**
   * Generate study recommendations for a student
   */
  async generateStudyRecommendations(studentData) {
    try {
      const { name, grades, weakSubjects, strengths } = studentData;

      const prompt = `Phân tích hiệu suất học sinh này và đưa ra gợi ý học tập cá nhân hóa:

Học sinh: ${name}
Điểm trung bình: ${grades.average}/10
Môn yếu: ${weakSubjects.join(', ')}
Môn mạnh: ${strengths.join(', ')}

Vui lòng cung cấp:
1. Top 3 gợi ý học tập cụ thể
2. Mẹo quản lý thời gian
3. Các lĩnh vực tập trung để cải thiện
4. Lời khuyên động viên

Trả lời bằng tiếng Việt với các gạch đầu dòng rõ ràng.`;

      const response = await this.callGemini(prompt);
      return response;
    } catch (error) {
      console.error('Recommendation Error:', error.message);
      throw new Error('Không thể tạo gợi ý học tập');
    }
  }

  /**
   * Predict student performance trend
   */
  predictPerformanceTrend(grades) {
    // Calculate trend using linear regression
    if (grades.length < 2) {
      return { trend: 'insufficient_data', prediction: null };
    }

    // Simple linear regression
    const n = grades.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    grades.forEach((grade, index) => {
      const x = index + 1;
      const y = parseFloat(grade.score);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next grade
    const nextX = n + 1;
    const prediction = slope * nextX + intercept;

    // Determine trend
    let trend;
    if (slope > 0.3) trend = 'improving';
    else if (slope < -0.3) trend = 'declining';
    else trend = 'stable';

    return {
      trend,
      prediction: Math.max(0, Math.min(10, prediction)).toFixed(2),
      slope: slope.toFixed(3),
      confidence: this.calculateConfidence(grades)
    };
  }

  /**
   * Calculate confidence level based on grade variance
   */
  calculateConfidence(grades) {
    const scores = grades.map(g => parseFloat(g.score));
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Lower std dev = higher confidence
    if (stdDev < 0.5) return 'high';
    if (stdDev < 1.5) return 'medium';
    return 'low';
  }

  /**
   * Generate course recommendations based on student interests and performance
   */
  async generateCourseRecommendations(studentProfile) {
    try {
      const { interests, completedCourses, avgGrade, careerGoals } = studentProfile;

      const prompt = `Dựa trên hồ sơ học sinh này, gợi ý 5 khóa học phù hợp:

Sở thích: ${interests.join(', ')}
Khóa học đã hoàn thành: ${completedCourses.join(', ')}
Điểm trung bình: ${avgGrade}/10
Mục tiêu nghề nghiệp: ${careerGoals}

Cho mỗi gợi ý, cung cấp:
- Tên khóa học
- Lý do được gợi ý
- Độ khó dự kiến
- Phù hợp với mục tiêu nghề nghiệp như thế nào

Trả lời bằng tiếng Việt.`;

      const response = await this.callGemini(prompt);
      return response;
    } catch (error) {
      console.error('Course Recommendation Error:', error.message);
      throw new Error('Không thể tạo gợi ý khóa học');
    }
  }

  /**
   * Generate report summary using AI
   */
  async generateReportSummary(reportData) {
    try {
      const { studentName, grades, attendance, behavior, period } = reportData;

      const prompt = `Tạo bản tóm tắt báo cáo toàn diện cho học sinh này:

Học sinh: ${studentName}
Kỳ: ${period}
Điểm trung bình: ${grades.average}/10
Tỷ lệ điểm danh: ${attendance.rate}%
Điểm hạnh kiểm: ${behavior.score}/10

Các môn học:
${grades.subjects.map(s => `- ${s.name}: ${s.score}/10`).join('\n')}

Vui lòng viết:
1. Tóm tắt hiệu suất tổng thể
2. Điểm mạnh và thành tích
3. Lĩnh vực cần cải thiện
4. Gợi ý cụ thể cho phụ huynh
5. Các bước tiếp theo

Viết bằng tiếng Việt, giọng điệu chuyên nghiệp nhưng ấm áp, phù hợp với phụ huynh.`;

      const response = await this.callGemini(prompt);
      return response;
    } catch (error) {
      console.error('Report Generation Error:', error.message);
      throw new Error('Không thể tạo báo cáo tóm tắt');
    }
  }
}

module.exports = new AIService();
