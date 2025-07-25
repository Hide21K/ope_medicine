import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const form = document.getElementById('judgeForm');
    if (!form) return;
    form.onsubmit = async function(e) {
      e.preventDefault();
      const drugsInput = document.getElementById('drugs').value;
      const surgeryDate = document.getElementById('surgeryDate').value;
      const drugs = drugsInput.split('\n').map(d => d.trim()).filter(Boolean);
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = '判定中...';
      console.log('送信データ:', drugs, surgeryDate);
      const allResults = [];
      for (let i = 0; i < drugs.length; i++) {
        const drug = drugs[i];
        try {
          const res = await fetch('/api/judge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drug, surgeryDate })
          });
          const data = await res.json();
          console.log('Difyレスポンス:', data);
          allResults.push({ drug, answer: data.text || data.error || 'No response' });
        } catch (err) {
          console.log('fetchエラー:', err);
          allResults.push({ drug, answer: 'エラー: ' + err });
        }
      }
      resultsDiv.innerHTML = allResults.map(r => `<div style='margin-bottom:16px; padding:8px; border:1px solid #ccc; border-radius:6px;'><b>${r.drug}</b><br>${r.answer}</div>`).join('');
    };
  }, []);

  return (
    <main style={{ maxWidth: 400, margin: '0 auto', padding: 20 }}>
      <h1>術前休薬判定</h1>
      <form id="judgeForm">
        <label htmlFor="drugs">薬剤名（1行に1つ）</label><br />
        <textarea id="drugs" rows={4} style={{ width: '100%' }} required></textarea><br />
        <label htmlFor="surgeryDate">手術日</label><br />
        <input id="surgeryDate" type="date" style={{ width: '100%' }} required /><br />
        <button type="submit" style={{ marginTop: 16 }}>判定する</button>
      </form>
      <div id="results" style={{ marginTop: 32 }}></div>
    </main>
  );
} 