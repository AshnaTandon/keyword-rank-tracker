export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: "Keyword Rank Tracker backend is working!"
  });
}
