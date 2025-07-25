export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { drug, surgeryDate } = req.body;
  if (!drug || !surgeryDate) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  console.log('受信:', { drug, surgeryDate });
  try {
    const difyRes = await fetch('https://api.dify.ai/v1/workflows/run', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer app-MnEVwj0pyub6frKBkG6IfLf3',
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
    // Difyのtextレスポンスを返す
    res.status(200).json({ text: data?.data?.outputs?.text || data?.message || 'No response' });
  } catch (e) {
    console.log('Dify fetchエラー:', e);
    res.status(500).json({ error: 'Dify APIエラー: ' + e.message });
  }
} 