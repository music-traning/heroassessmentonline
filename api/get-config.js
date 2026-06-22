import { createClient } from '@vercel/edge-config';

export default async function handler(req, res) {
  const { cid } = req.query;
  
  // 企業コードの指定がない場合は、標準のGuestCompany設定を返す
  const companyId = cid || "GuestCompany";

  try {
    // 自動セットされた環境変数を使って接続
    const edgeConfig = createClient(process.env.EDGE_CONFIG);
    const companies = await edgeConfig.get('companies');
    
    // 登録されている企業であればそのデータを、なければGuestCompanyのデータを取得
    const config = companies[companyId] || companies["GuestCompany"];
    
    return res.status(200).json(config);
  } catch (error) {
    console.error('Edge Config Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}