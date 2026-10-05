export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed"
    });
  }

  const {
    website,
    keyword,
    location,
    device = "Desktop",
    depth = 100
  } = req.body || {};

  if (!website || !keyword || !location) {
    return res.status(400).json({
      success: false,
      message: "Website, keyword and location are required"
    });
  }

  const OPENSERP_URL =
    process.env.OPENSERP_URL || "http://127.0.0.1:7000";

  const cleanDomain = website
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();

  const locations = {
    "Toronto, Canada": {
      region: "Toronto",
      lang: "EN"
    },

    "Dubai, UAE": {
      region: "Dubai",
      lang: "EN"
    },

    "New York, USA": {
      region: "New York",
      lang: "EN"
    }
  };

  const selected = locations[location];

  if (!selected) {
    return res.status(400).json({
      success: false,
      message: "Unsupported location"
    });
  }

  const params = new URLSearchParams({
    text: keyword,
    limit: String(Math.min(Number(depth) || 100, 100)),
    region: selected.region,
    lang: selected.lang,
    filter: "true"
  });

  const searchUrl =
    `${OPENSERP_URL}/google/search?${params.toString()}`;

  try {
    const response = await fetch(searchUrl);

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "OpenSERP returned an error",
        details: data
      });
    }

    const results = Array.isArray(data.results)
      ? data.results
      : [];

    let found = null;

    for (const result of results) {
      if (!result.url) continue;

      let domain = "";

      try {
        domain = new URL(result.url)
          .hostname
          .replace(/^www\./i, "")
          .toLowerCase();
      } catch {
        continue;
      }

      if (
        domain === cleanDomain ||
        domain.endsWith("." + cleanDomain)
      ) {
        found = result;
        break;
      }
    }

    if (!found) {
      return res.status(200).json({
        success: true,
        found: false,
        keyword,
        location,
        device,
        position: null,
        page: null,
        position_on_page: null,
        ranking_url: null
      });
    }

    const position =
      Number(
        found.rank ||
        found.position?.absolute
      );

    const page =
      Math.ceil(position / 10);

    const positionOnPage =
      ((position - 1) % 10) + 1;

    return res.status(200).json({
      success: true,
      found: true,

      keyword,
      location,
      device,

      position,
      page,

      position_on_page: positionOnPage,

      ranking_url: found.url
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not connect to OpenSERP",
      error: error.message
    });
  }
}
