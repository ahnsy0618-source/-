// Yahoo Finance의 차트 API는 무료·키 불필요지만 브라우저에서 직접 호출하면 CORS로 막힌다.
// 이 서버리스 함수가 서버 쪽에서 대신 호출해서 프론트엔드에 결과만 넘겨준다.
export default async function handler(req, res) {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5EKS11", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) {
      res.status(502).json({ error: "코스피 데이터를 파싱하지 못했습니다." });
      return;
    }
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json({
      price: meta.regularMarketPrice,
      prevClose: meta.chartPreviousClose,
      time: meta.regularMarketTime,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
