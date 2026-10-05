export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed"
    });
  }

  const { website, keyword, location, results } = req.body;

  if (!website || !keyword || !location || !Array.isArray(results)) {
    return res.status(400).json({
      success: false,
      message: "Website, keyword, location and results are required"
    });
  }

  const cleanDomain = website
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .toLowerCase();

  const rankingResult = results.find((result) => {
    if (!result.url) return false;

    try {
      const resultDomain = new URL(result.url).hostname
        .replace(/^www\./, "")
        .toLowerCase();

      return resultDomain === cleanDomain ||
             resultDomain.endsWith("." + cleanDomain);

    } catch {
      return false;
    }
  });

  if (!rankingResult) {
    return res.status(200).json({
      success: true,
      found: false,
      keyword,
      location,
      position: null,
      page: null,
      ranking_url: null
    });
  }

  const position = rankingResult.position;

  return res.status(200).json({
    success: true,
    found: true,
    keyword,
    location,
    position,
    page: Math.ceil(position / 10),
    ranking_url: rankingResult.url
  });
}
