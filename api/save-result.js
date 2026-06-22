export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const bodyData = req.body;
    // 環境変数からGASのURLを読み込む
    const gasUrl = process.env.GAS_WEBAPP_URL;

    if (!gasUrl) {
      return res.status(500).json({ error: 'GAS URL is not configured' });
    }

    // GASへデータを転送
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}