import { createClient } from '@vercel/edge-config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const bodyData = req.body;
    const edgeConfig = createClient(process.env.EDGE_CONFIG);
    const companies = await edgeConfig.get('companies');

    // 【防波堤】Edge Configに登録されていない企業コードからのデータ送信は即座に拒否
    if (!bodyData.companyId || !companies[bodyData.companyId]) {
      console.warn(`[Security] Unauthorized Company ID blocked: ${bodyData.companyId}`);
      return res.status(403).json({ error: 'Invalid Corporate Code' });
    }

    const gasUrl = process.env.GAS_WEBAPP_URL;
    if (!gasUrl) {
      return res.status(500).json({ error: 'GAS URL is not configured' });
    }

    // GASへ安全にデータを横流し
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();

    if (result.status === "error") {
      console.error('[GAS Error]', result.message);
      return res.status(500).json({ error: result.message });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}