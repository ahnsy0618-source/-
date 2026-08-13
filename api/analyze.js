// Vercel 서버리스 함수. ANTHROPIC_API_KEY를 Vercel 프로젝트 환경변수에 등록해야 동작함.
// 프론트엔드에는 API 키를 노출하지 않기 위해 이 함수를 경유해서 Anthropic API를 호출함.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 프로젝트 환경변수에 등록해주세요." });
    return;
  }

  const { 부서, actual, target, achievementPct, prevVal, diff } = req.body || {};
  if (!부서) {
    res.status(400).json({ error: "부서 정보가 없습니다." });
    return;
  }

  const prompt = `당신은 증권사 경영지원팀에서 부문별 실적을 보고 1차 초안을 작성하는 기획 담당자입니다.
아래는 "${부서}"의 이번 분기(연 진행률 기준 보정) 당기순이익 현황입니다. 이 숫자 외에는 아무 정보도 없습니다.

- 목표(진행률 보정): ${target}억원
- 실적: ${actual}억원 (달성률 ${achievementPct}%)
- 전분기 실적: ${prevVal}억원 (전분기 대비 ${diff >= 0 ? "+" : ""}${diff}억원)

아래 형식으로 아주 짧은 초안을 작성하세요. 실제 원인은 숫자만으로 알 수 없으므로, 추정 원인은 반드시 "가능성이 있는 요인" 같은 추측 표현을 쓰고 확정적으로 서술하지 마세요.

[현황 요약]
(2문장 이내)

[추정 원인 (가능성, 확인 필요)]
- 요인 1
- 요인 2

[개선 방안 제안 (검토용)]
- 방안 1
- 방안 2

[주의]
이 초안은 숫자만 보고 AI가 작성한 추정치입니다. 실제 원인과 방안은 담당 부서 확인 후 반영해야 합니다.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(502).json({ error: data?.error?.message || "Anthropic API 호출에 실패했습니다." });
      return;
    }
    const text = data?.content?.[0]?.text || "초안을 생성하지 못했습니다.";
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
