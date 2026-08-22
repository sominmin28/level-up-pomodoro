const express = require('express');
const authMiddleware = require('../middleware/auth');
const OpenAI = require('openai');

const router = express.Router();
router.use(authMiddleware);

// POST /api/ai/levelup-message
router.post('/levelup-message', async (req, res) => {
  try {
    const { level, total_pomodoros } = req.body;
    const nickname = req.user.nickname;

    // Use OpenAI if key is set, otherwise return a curated message
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 생산성 코치입니다. 사용자가 포모도로 앱에서 레벨업할 때 진지하고 의미있는 격려 메시지를 한국어로 제공합니다. 
메시지는 2-3문장으로 짧고 임팩트있게 작성하세요. 명언이나 격언을 포함하면 좋습니다.`
          },
          {
            role: 'user',
            content: `${nickname}님이 레벨 ${level}에 도달했습니다. 총 ${total_pomodoros}개의 포모도로를 완료했습니다. 격려 메시지를 작성해주세요.`
          }
        ],
        max_tokens: 200,
        temperature: 0.8,
      });

      return res.json({ message: completion.choices[0].message.content });
    }

    // Fallback messages when no API key
    const messages = [
      `축하합니다, ${nickname}님! 레벨 ${level}에 도달하셨습니다. "천리길도 한 걸음부터" - 당신의 꾸준한 노력이 빛을 발하고 있습니다. 계속해서 앞으로 나아가세요!`,
      `레벨 ${level} 달성을 축하드립니다, ${nickname}님! "성공은 습관이다" - 매일 반복되는 집중의 힘이 당신을 더 높은 곳으로 이끌고 있습니다.`,
      `${nickname}님, 레벨 ${level} 달성을 진심으로 축하합니다! "위대한 일은 갑자기 이루어지지 않는다" - 지금 이 순간도 당신의 미래를 만들어가고 있습니다.`,
      `레벨 ${level} 도달! 축하합니다, ${nickname}님. "집중은 성공의 열쇠다" - 당신이 걸어온 ${total_pomodoros}번의 집중 세션이 결코 헛되지 않았습니다.`,
      `${nickname}님, 레벨 ${level} 달성을 축하합니다! "작은 진보가 쌓여 큰 변화를 만든다" - 오늘도 최선을 다하는 당신이 자랑스럽습니다.`,
    ];

    const message = messages[(level - 1) % messages.length];
    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI service error' });
  }
});

// POST /api/ai/stats-analysis - Microsoft Agent Framework style stats analysis
router.post('/stats-analysis', async (req, res) => {
  try {
    const { stats } = req.body;
    const nickname = req.user.nickname;

    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 생산성 분석 에이전트입니다. 사용자의 포모도로 통계를 분석하여 
인사이트와 개선 제안을 한국어로 제공합니다. 구체적이고 실용적인 조언을 3-4문장으로 작성하세요.`
          },
          {
            role: 'user',
            content: `${nickname}님의 통계: 오늘 포모도로 ${stats.today?.pomodoros || 0}개, 
이번 주 ${stats.week?.pomodoros || 0}개, 최고 연속 ${stats.best_streak || 0}일.
가장 생산적인 시간대: ${stats.peak_hour || '데이터 없음'}시.
이 통계를 분석하고 개선 방향을 제안해주세요.`
          }
        ],
        max_tokens: 250,
        temperature: 0.7,
      });

      return res.json({ analysis: completion.choices[0].message.content });
    }

    // Fallback analysis
    const todayCount = stats.today?.pomodoros || 0;
    let analysis;
    if (todayCount === 0) {
      analysis = `${nickname}님, 오늘은 아직 포모도로 세션을 시작하지 않으셨네요. 작은 시작이 큰 변화를 만듭니다. 지금 바로 25분 집중 세션을 시작해보세요!`;
    } else if (todayCount < 4) {
      analysis = `오늘 ${todayCount}개의 세션을 완료하셨군요! 꾸준히 유지하면 이번 주 목표를 달성할 수 있습니다. 규칙적인 휴식을 취하면서 집중력을 유지하세요.`;
    } else {
      analysis = `오늘 ${todayCount}개의 세션을 완료하셨습니다! 훌륭한 생산성을 보여주고 계십니다. 이런 흐름을 유지하면 레벨업도 머지않았습니다.`;
    }

    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI service error' });
  }
});

module.exports = router;
