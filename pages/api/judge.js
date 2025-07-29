export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { drug, drugs, surgeryDate } = req.body;
  
  // 単一薬剤の場合
  if (drug && surgeryDate) {
    console.log('単一薬剤の判定:', { drug, surgeryDate });
    try {
      const difyRes = await fetch('https://api.dify.ai/v1/workflows/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            medicine_name: drug,
            ope_day: surgeryDate.replace(/-/g, '/'),
          },
          response_mode: 'blocking',
          user: 'test-user-123',
        }),
      });
      const data = await difyRes.json();
      console.log('Difyレスポンス:', data);
      res.status(200).json({ text: data?.data?.outputs?.text || data?.message || 'No response' });
    } catch (e) {
      console.log('Dify fetchエラー:', e);
      res.status(500).json({ error: 'Dify APIエラー: ' + e.message });
    }
    return;
  }
  
  // 複数薬剤の場合
  if (drugs && Array.isArray(drugs) && surgeryDate) {
    console.log('複数薬剤の判定:', { drugs, surgeryDate });
    const results = [];
    
    for (const drug of drugs) {
      try {
        console.log(`薬剤「${drug}」の判定を開始`);
        const difyRes = await fetch('https://api.dify.ai/v1/workflows/run', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {
              medicine_name: drug,
              ope_day: surgeryDate.replace(/-/g, '/'),
            },
            response_mode: 'blocking',
            user: 'test-user-123',
          }),
        });
        
        const data = await difyRes.json();
        console.log(`薬剤「${drug}」の結果:`, data);
        results.push({ 
          drug, 
          text: data?.data?.outputs?.text || data?.message || 'No response' 
        });
      } catch (e) {
        console.log(`薬剤「${drug}」のエラー:`, e);
        results.push({ 
          drug, 
          error: 'Dify APIエラー: ' + e.message 
        });
      }
    }
    
    res.status(200).json({ results });
    return;
  }
  
  // 無効なリクエスト
  res.status(400).json({ error: 'Invalid input: drug or drugs array and surgeryDate are required' });
} 