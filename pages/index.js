import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    console.log('アプリケーションが初期化されました');
    console.log('現在のURL:', window.location.href);
    console.log('現在のホスト名:', window.location.hostname);
    
    // Dify API設定
    const DIFY_CONFIG = {
      url: '/api/judge',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // DOM要素の取得
    const elements = {
      form: document.getElementById('medicineForm'),
      medicineNameInput: document.getElementById('medicine-name'),
      surgeryDateInput: document.getElementById('surgery-date'),
      submitBtn: document.getElementById('submit-btn'),
      btnText: document.querySelector('.btn-text'),
      loadingSpinner: document.getElementById('loading-spinner'),
      resultsContainer: document.getElementById('results-container'),
      resultsContent: document.getElementById('results-content'),
      errorContainer: document.getElementById('error-container'),
      errorMessage: document.getElementById('error-message'),
      downloadBtn: document.getElementById('download-btn'),
      pdfDownloadBtn: document.getElementById('pdf-download-btn')
    };

    // DOM要素の存在確認
    const missingElements = Object.entries(elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);
    if (missingElements.length > 0) {
      console.error('以下のDOM要素が見つかりません:', missingElements);
      return;
    }
    console.log('すべてのDOM要素が正常に取得されました');

    // イベントリスナーの設定
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.medicineNameInput.addEventListener('input', validateForm);
    elements.surgeryDateInput.addEventListener('change', validateForm);
    if (elements.downloadBtn) {
      elements.downloadBtn.addEventListener('click', handleDownload);
    }
    if (elements.pdfDownloadBtn) {
      elements.pdfDownloadBtn.addEventListener('click', handlePdfDownload);
    }

    // 初期状態の設定
    hideResults();
    hideError();
    const today = new Date().toISOString().split('T')[0];
    elements.surgeryDateInput.min = today;

    // グローバル変数で結果を保持
    window.currentResults = [];

    // --- Functions ---
    function hideResults() {
      elements.resultsContainer.classList.remove('show');
      elements.resultsContainer.style.display = 'none';
      
      // ダウンロードボタンを非表示
      if (elements.downloadBtn) {
        elements.downloadBtn.classList.remove('visible');
      }
      if (elements.pdfDownloadBtn) {
        elements.pdfDownloadBtn.classList.remove('visible');
      }
    }
    function showResults() {
      elements.resultsContainer.classList.add('show');
      elements.resultsContainer.style.display = 'block';
    }
    function hideError() {
      elements.errorContainer.classList.remove('show');
      elements.errorContainer.style.display = 'none';
    }
    function displayError(message) {
      elements.errorMessage.textContent = message;
      elements.errorContainer.classList.add('show');
      elements.errorContainer.style.display = 'block';
      elements.errorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function setLoadingState(isLoading) {
      if (isLoading) {
        elements.submitBtn.disabled = true;
        elements.submitBtn.classList.add('loading');
        elements.btnText.style.display = 'none';
        elements.loadingSpinner.style.display = 'block';
      } else {
        elements.submitBtn.disabled = false;
        elements.submitBtn.classList.remove('loading');
        elements.btnText.style.display = 'block';
        elements.loadingSpinner.style.display = 'none';
      }
    }
    function validateForm() {
      const medicineNames = elements.medicineNameInput.value.trim();
      const surgeryDate = elements.surgeryDateInput.value;
      const isValid = medicineNames && surgeryDate;
      elements.submitBtn.disabled = !isValid;
    }
    function getFormData() {
      const medicineNames = elements.medicineNameInput.value.trim();
      const drugs = medicineNames.split('\n').map(d => d.trim()).filter(Boolean);
      return {
        drugs,
        surgeryDate: elements.surgeryDateInput.value
      };
    }
    function validateFormData(formData) {
      if (!formData.drugs || formData.drugs.length === 0) {
        displayError('薬剤名を入力してください');
        return false;
      }
      if (!formData.surgeryDate) {
        displayError('手術予定日を選択してください');
        return false;
      }
      const surgeryDate = new Date(formData.surgeryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (surgeryDate < today) {
        displayError('手術予定日は今日以降の日付を選択してください');
        return false;
      }
      return true;
    }
    function formatResults(results) {
      if (!results || results.length === 0) {
        return '<div class="result-item">結果が取得できませんでした。</div>';
      }
      
      return results.map((result, index) => {
        const drugName = result.drug;
        const resultText = result.text || result.error || '結果が取得できませんでした';
        
        return `
          <div class="drug-result">
            <h3 class="drug-name">${escapeHtml(drugName)}</h3>
            <div class="result-content">
              ${formatResultText(resultText)}
            </div>
          </div>
        `;
      }).join('');
    }
    function formatResultText(text) {
      if (!text) return '<div class="result-item">結果が取得できませんでした。</div>';
      
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        return '<div class="result-item">結果が取得できませんでした。</div>';
      }
      
      const formattedLines = lines.map(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('について') || trimmedLine.includes('判定結果') || trimmedLine.includes('中止') || trimmedLine.includes('継続')) {
          return `<div class="result-item"><strong>${escapeHtml(trimmedLine)}</strong></div>`;
        }
        return `<div class="result-item">${escapeHtml(trimmedLine)}</div>`;
      });
      
      return formattedLines.join('');
    }
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    function displayResults(results) {
      window.currentResults = results;
      const formattedResults = formatResults(results);
      elements.resultsContent.innerHTML = formattedResults;
      showResults();
      elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // ダウンロードボタンを表示
      if (elements.downloadBtn) {
        elements.downloadBtn.classList.add('visible');
      }
      if (elements.pdfDownloadBtn) {
        elements.pdfDownloadBtn.classList.add('visible');
      }
    }
    async function handleFormSubmit(event) {
      event.preventDefault();
      const formData = getFormData();
      if (!validateFormData(formData)) return;
      
      setLoadingState(true);
      hideResults();
      hideError();
      
      try {
        console.log('複数薬剤の判定を開始:', formData);
        
        // 複数薬剤を一度にAPIに送信
        const response = await fetch(DIFY_CONFIG.url, {
          method: 'POST',
          headers: DIFY_CONFIG.headers,
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API リクエストに失敗しました (${response.status}): ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('APIレスポンス:', responseData);
        
        // 結果の処理
        let results = [];
        if (responseData.results && Array.isArray(responseData.results)) {
          // 複数薬剤の結果
          results = responseData.results;
        } else if (responseData.text) {
          // 単一薬剤の結果（フォールバック）
          results = [{ drug: formData.drugs[0], text: responseData.text }];
        } else {
          throw new Error('予期しないレスポンス形式です');
        }
        
        displayResults(results);
      } catch (error) {
        console.error('エラーが発生しました:', error);
        displayError(error.message);
      } finally {
        setLoadingState(false);
      }
    }
    
    // Word文書ダウンロード機能
    async function handleDownload() {
      if (!window.currentResults || window.currentResults.length === 0) {
        alert('ダウンロードする結果がありません');
        return;
      }

      const { Document, Packer, Paragraph, TextRun, UnderlineType } = await import('docx');

      const surgeryDate = elements.surgeryDateInput.value;
      const currentDate = new Date().toLocaleDateString('ja-JP');

      const toJaDate = (iso) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      };

      const formattedSurgeryDate = toJaDate(surgeryDate);

      try {
        const children = [];

        // タイトル（サイズ指定なしの指示だが16pt程度で統一）
        children.push(new Paragraph({
          children: [new TextRun({ text: '氏名：____________________様の手術前の薬物中止について', size: 32 /*16pt*/, color: '000000' })],
        }));
        children.push(new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }));

        // 手術予定日（16pt 黒）
        children.push(new Paragraph({
          children: [new TextRun({ text: `手術予定日: ${formattedSurgeryDate}`, size: 32 /*16pt*/, color: '000000' })],
        }));
        children.push(new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }));

        // 見出し（16pt 黒）
        children.push(new Paragraph({
          children: [new TextRun({ text: '術前に休薬が必要な薬剤と休薬開始日', size: 32 /*16pt*/, color: '000000' })],
        }));
        children.push(new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }));

        // 各薬剤
        window.currentResults.forEach((result, index) => {
          const raw = result.text || result.error || '';

          // 結果テキストから休薬開始日と理由を抽出
          let stopDateIso = '';
          let reason = '';
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!stopDateIso && (line.includes('休薬日') || line.includes('休薬開始日'))) {
              const m = line.match(/(?:休薬日|休薬開始日)\s*[:：]\s*(\d{4}[-\/]\d{2}[-\/]\d{2})/);
              if (m) stopDateIso = m[1];
            }
            if (!reason && line.includes('休薬理由')) {
              const r = line.split(/休薬理由\s*[:：]/)[1];
              if (r) reason = r.trim();
            }
          }
          const stopDateJa = stopDateIso ? toJaDate(stopDateIso) : '';

          // 1. 薬剤名（14pt 黒）
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. 薬剤名: ${result.drug}`, size: 28 /*14pt*/, color: '000000' }),
            ],
          }));

          // 休薬開始日（12pt、"休薬開始日:"は黒、日付部分は赤かつアンダーライン）
          const stopDateRuns = [
            new TextRun({ text: '　休薬開始日: ', size: 24 /*12pt*/, color: '000000' }),
          ];
          if (stopDateJa) {
            stopDateRuns.push(
              new TextRun({
                text: stopDateJa,
                size: 24 /*12pt*/,
                color: 'FF0000',
                underline: { type: UnderlineType.SINGLE },
              })
            );
          } else {
            stopDateRuns.push(
              new TextRun({
                text: '記載なし',
                size: 24 /*12pt*/,
                color: '000000',
              })
            );
          }
          children.push(new Paragraph({ children: stopDateRuns }));

          // 休薬理由（12pt 黒）
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `　休薬理由: ${reason || '記載なし'}`, size: 24 /*12pt*/, color: '000000' }),
            ],
          }));

          // 空行
          children.push(new Paragraph({ children: [new TextRun({ text: '', size: 24 })] }));
        });

        // 最後の注意文（14pt 黒）
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: '休薬をわすれてしまうと手術を受けられません。ご理解ならびにご協力よろしくお願いします。',
              size: 28 /*14pt*/,
              color: '000000',
            }),
          ],
        }));

        const doc = new Document({ sections: [{ children }] });
        const blob = await Packer.toBlob(doc);

        const fileName = `手術前薬物中止判定_${surgeryDate}_${currentDate.replace(/\//g, '')}.docx`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        console.log('Word文書をダウンロードしました:', fileName);
      } catch (error) {
        console.error('DOCX作成エラー:', error);
        alert('Wordファイルの作成に失敗しました: ' + error.message);
      }
    }

    // PDF文書ダウンロード機能
    async function handlePdfDownload() {
      if (!window.currentResults || window.currentResults.length === 0) {
        alert('ダウンロードする結果がありません');
        return;
      }

      try {
        const surgeryDate = elements.surgeryDateInput.value;
        const currentDate = new Date().toLocaleDateString('ja-JP');

        const toJaDate = (iso) => {
          const d = new Date(iso);
          if (Number.isNaN(d.getTime())) return iso;
          return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        };

        const formattedSurgeryDate = toJaDate(surgeryDate);

        // 印刷用のHTMLを作成
        const printContent = `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>手術前薬物中止判定</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; font-family: 'MS Gothic', 'Yu Gothic', sans-serif; }
                .page { page-break-after: always; }
                .no-print { display: none; }
              }
              body { font-family: 'MS Gothic', 'Yu Gothic', sans-serif; line-height: 1.6; }
              .title { font-size: 18pt; font-weight: bold; margin-bottom: 20px; }
              .section { margin-bottom: 15px; }
              .drug-item { margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
              .drug-name { font-size: 14pt; font-weight: bold; color: #000; }
              .stop-date { font-size: 12pt; color: #000; }
              .stop-date-value { color: #FF0000; text-decoration: underline; }
              .reason { font-size: 12pt; color: #000; }
              .note { font-size: 14pt; font-weight: bold; margin-top: 30px; color: #000; }
              .print-btn { 
                position: fixed; top: 20px; right: 20px; 
                padding: 10px 20px; background: #007bff; color: white; 
                border: none; border-radius: 5px; cursor: pointer; 
              }
            </style>
          </head>
          <body>
            <button class="print-btn no-print" onclick="window.print()">PDFとして保存</button>
            
            <div class="title">氏名：____________________様の手術前の薬物中止について</div>
            
            <div class="section">
              <strong>手術予定日: ${formattedSurgeryDate}</strong>
            </div>
            
            <div class="section">
              <strong>術前に休薬が必要な薬剤と休薬開始日</strong>
            </div>
            
            ${window.currentResults.map((result, index) => {
              const raw = result.text || result.error || '';
              
              // 結果テキストから休薬開始日と理由を抽出
              let stopDateIso = '';
              let reason = '';
              const lines = raw.split('\n');
              for (const line of lines) {
                if (!stopDateIso && (line.includes('休薬日') || line.includes('休薬開始日'))) {
                  const m = line.match(/(?:休薬日|休薬開始日)\s*[:：]\s*(\d{4}[-\/]\d{2}[-\/]\d{2})/);
                  if (m) stopDateIso = m[1];
                }
                if (!reason && line.includes('休薬理由')) {
                  const r = line.split(/休薬理由\s*[:：]/)[1];
                  if (r) reason = r.trim();
                }
              }
              const stopDateJa = stopDateIso ? toJaDate(stopDateIso) : '';
              
              return `
                <div class="drug-item">
                  <div class="drug-name">${index + 1}. 薬剤名: ${result.drug}</div>
                  <div class="stop-date">
                    　休薬開始日: <span class="stop-date-value">${stopDateJa || '記載なし'}</span>
                  </div>
                  <div class="reason">　休薬理由: ${reason || '記載なし'}</div>
                </div>
              `;
            }).join('')}
            
            <div class="note">
              休薬をわすれてしまうと手術を受けられません。ご理解ならびにご協力よろしくお願いします。
            </div>
          </body>
          </html>
        `;

        // 新しいウィンドウで印刷用HTMLを開く
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // 印刷ダイアログを自動で開く（PDFとして保存可能）
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        console.log('PDF印刷ダイアログを開きました');
      } catch (error) {
        console.error('PDF作成エラー:', error);
        alert('PDF作成に失敗しました。Word文書をダウンロードして、手動でPDFに変換してください。');
        
        // Word文書を自動ダウンロード
        handleDownload();
      }
    }
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>手術前薬物中止判定システム</h1>
        <p className="subtitle">手術前に服用中の薬の中止時期を確認できます</p>
      </header>
      <main className="main-content">
        <div className="form-container">
          <form id="medicineForm" className="medicine-form">
            <div className="form-group">
              <label htmlFor="medicine-name">薬剤名（1行に1つ）</label>
              <textarea 
                id="medicine-name" 
                name="medicine-name" 
                placeholder="例：アスピリン&#10;ワルファリン&#10;クロピドグレル" 
                rows={5}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="surgery-date">手術予定日</label>
              <input type="date" id="surgery-date" name="surgery-date" required />
            </div>
            <button type="submit" className="submit-btn" id="submit-btn">
              <span className="btn-text">判定を開始</span>
              <div className="loading-spinner" id="loading-spinner" style={{ display: 'none' }}></div>
            </button>
          </form>
        </div>
        <div className="results-container" id="results-container" style={{ display: 'none' }}>
          <div className="results-header">
            <h2 className="results-title">判定結果</h2>
            <div className="buttons-row">
              <button 
                id="download-btn" 
                className="download-btn"
              >
                Word文書（患者様用）
              </button>
              <button 
                id="pdf-download-btn" 
                className="pdf-download-btn"
              >
                PDF文書（患者様用）
              </button>
            </div>
          </div>
          <div className="results-content" id="results-content"></div>
        </div>
        <div className="error-container" id="error-container" style={{ display: 'none' }}>
          <div className="error-message" id="error-message"></div>
        </div>
      </main>
      <footer className="footer">
        <p>&copy; 2025 手術前薬物中止判定システム</p>
      </footer>
    </div>
  );
} 