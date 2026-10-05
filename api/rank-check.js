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
      message: "website, keyword and location are required"
    });
  }

  /*
   * IMPORTANT:
   * This URL works only when this API is running on the
   * same machine as OpenSERP.
   *
   * Vercel cannot access your laptop's 127.0.0.1.
   */
  const OPENSERP_URL =
    process.env.OPENSERP_URL || "http://127.0.0.1:7000";

  const cleanDomain = website
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();

  const locationMap = {
    "Toronto, Canada": {
      region: "Toronto",
      country: "ca",
      language: "en"
    },

    "Dubai, UAE": {
      region: "Dubai",
      country: "ae",
      language: "en"
    },

    "New York, USA": {
      region: "New York",
      country: "us",
      language: "en"
    }
  };

  const selected =
    locationMap[location];

  if (!selected) {
    return res.status(400).json({
      success: false,
      message: "Unsupported location"
    });
  }

  /*
   * OpenSERP query.
   *
   * We keep the request in one place so that
   * the search engine can be changed later without
   * changing the frontend.
   */

  const params = new URLSearchParams({
    q: keyword,
    limit: String(Math.min(Number(depth) || 100, 100)),
    region: selected.region,
    lang: selected.language
  });

  const searchUrl =
    `${OPENSERP_URL}/search?${params.toString()}`;

  try {

    const response =
      await fetch(searchUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

    if (!response.ok) {

      const errorText =
        await response.text();

      return res.status(502).json({
        success: false,
        message: "OpenSERP request failed",
        status: response.status,
        details: errorText.slice(0, 500)
      });
    }

    const data =
      await response.json();

    /*
     * OpenSERP versions can expose result arrays
     * under different property names.
     */

    const results =
      Array.isArray(data)
        ? data
        : (
            data.organic ||
            data.results ||
            data.items ||
            data.data ||
            []
          );

    let found = null;

    for (
      let i = 0;
      i < results.length;
      i++
    ) {

      const item =
        results[i] || {};

      const url =
        item.url ||
        item.link ||
        item.href ||
        item.destination ||
        "";

      if (!url) continue;

      let hostname = "";

      try {

        hostname =
          new URL(url)
            .hostname
            .replace(/^www\./i, "")
            .toLowerCase();

      } catch {

        continue;

      }

      if (
        hostname === cleanDomain ||
        hostname.endsWith("." + cleanDomain)
      ) {

        found = {
          position: i + 1,
          url
        };

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
      found.position;

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

      position_on_page:
        positionOnPage,

      ranking_url:
        found.url
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Could not connect to OpenSERP",
      error: error.message
    });

  }
}
