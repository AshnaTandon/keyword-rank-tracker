export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed"
    });
  }

  const { website, keyword, location, device } = req.body;

  if (!website || !keyword || !location || !device) {
    return res.status(400).json({
      success: false,
      message: "Website, keyword, location and device are required"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Ranking request received successfully",
    data: {
      website,
      keyword,
      location,
      device
    }
  });
}
