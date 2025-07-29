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
      downloadBtn: document.getElementById('download-btn')
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
        elements.downloadBtn.style.display = 'block';
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
      
      const surgeryDate = elements.surgeryDateInput.value;
      const currentDate = new Date().toLocaleDateString('ja-JP');
      
      // 手術日を日本語形式に変換
      const surgeryDateObj = new Date(surgeryDate);
      const formattedSurgeryDate = `${surgeryDateObj.getFullYear()}年${surgeryDateObj.getMonth() + 1}月${surgeryDateObj.getDate()}日`;
      
      // 新しいフォーマットでDOCX形式のコンテンツを作成
      let docContent = `様の手術前の薬物中止について

手術予定日: ${formattedSurgeryDate}

術前に休薬が必要な薬剤と休薬開始日

`;

      window.currentResults.forEach((result, index) => {
        const resultText = result.text || result.error || '結果が取得できませんでした';
        
        // 結果テキストから必要な情報を抽出
        let drugName = result.drug;
        let genericName = '';
        let drugClass = '';
        let stopDate = '';
        let reason = '';
        
        // 結果テキストを解析して情報を抽出
        const lines = resultText.split('\n');
        lines.forEach(line => {
          if (line.includes('一般名:')) {
            genericName = line.split('一般名:')[1]?.trim() || '';
          }
          if (line.includes('薬剤系統:')) {
            drugClass = line.split('薬剤系統:')[1]?.trim() || '';
          }
          if (line.includes('休薬開始日:')) {
            const dateMatch = line.match(/休薬開始日:\s*(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              const dateObj = new Date(dateMatch[1]);
              stopDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
            }
          }
          if (line.includes('休薬理由:')) {
            reason = line.split('休薬理由:')[1]?.trim() || '';
          }
        });
        
        // フォーマットされた内容を追加
        docContent += `${index + 1}. 薬剤名: ${drugName}
　休薬開始日: ${stopDate}
　休薬理由: ${reason}

`;
      });
      
      // 最後の注意書きを追加
      docContent += `休薬をわすれてしまうと手術を受けられません。ご理解ならびにご協力よろしくお願いします。`;
      
      // ファイル名を作成
      const fileName = `手術前薬物中止判定_${surgeryDate}_${currentDate.replace(/\//g, '')}.docx`;
      
      // UTF-8 BOMを追加してBlobを作成
      const utf8BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const contentBytes = new TextEncoder().encode(docContent);
      const combinedBytes = new Uint8Array(utf8BOM.length + contentBytes.length);
      combinedBytes.set(utf8BOM);
      combinedBytes.set(contentBytes, utf8BOM.length);
      
      // Blobを作成してダウンロード
      const blob = new Blob([combinedBytes], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('DOCX文書をダウンロードしました:', fileName);
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
            <button 
              id="download-btn" 
              className="download-btn" 
              style={{ display: 'none' }}
            >
              DOCX文書をダウンロード
            </button>
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