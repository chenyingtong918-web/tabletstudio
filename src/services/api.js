import { systemPrompt } from '../data/systemPrompt';

// =========================================================
// 注意：请将这里的占位符替换为您真实的火山方舟 API Key
// =========================================================
const API_KEY = "ark-a7b969b2-98f8-451f-9261-0473616bfbce-44149";

const ENDPOINT_ID = "ep-20260605135439-xz4rr";

export const aiService = {
  /**
   * 发送流式对话请求
   * @param {Array} messagesHistory - 之前的聊天记录数组 [{role: 'user', content: '...'}, ...]
   * @param {Function} onChunkReceived - 每接收到一个字时的回调函数
   */
  async streamMessage(messagesHistory, onChunkReceived) {
    try {
      // 如果没有填写 API Key，则直接抛出提示
      if (API_KEY === "YOUR_API_KEY_HERE" || !API_KEY) {
        const errorMsg = "⚠️ 哎呀！您还没有在 `src/services/api.js` 中填写真实的 API_KEY 呢。请填写后再试哦！";
        onChunkReceived(errorMsg);
        return errorMsg;
      }

      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: ENDPOINT_ID,
          messages: [
            { role: "system", content: systemPrompt },
            ...messagesHistory.map(msg => ({ 
              role: msg.role, 
              content: Array.isArray(msg.content) ? msg.content : String(msg.content) 
            }))
          ],
          stream: true
        })
      });

      if (!response.ok) {
        const errorMsg = `⚠️ 请求失败: HTTP ${response.status}。请检查您的 API Key 是否正确或账户是否欠费。`;
        onChunkReceived(errorMsg);
        return errorMsg;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                fullText += data.choices[0].delta.content;
                onChunkReceived(fullText);
              }
            } catch (e) {
              console.warn("解析数据块失败:", dataStr);
            }
          }
        }
      }
      return fullText;
    } catch (error) {
      console.error("API 调用异常:", error);
      const errorMsg = "⚠️ 网络异常或跨域问题导致请求失败，请检查浏览器控制台 (Console)。";
      onChunkReceived(errorMsg);
      return errorMsg;
    }
  }
};
