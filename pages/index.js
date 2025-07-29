import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    console.log('アプリケーションが初期化されました');
    console.log('現在のURL:', window.location.href);
    console.log('現在のホスト名:', window.location.hostname);
    
    // JSZipを動的にインポート
    let JSZip;
    import('jszip').then(module => {
      JSZip = module.default;
      console.log('JSZip loaded successfully');
    }).catch(err => {
      console.error('JSZip load failed:', err);
    });
    
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
      
      if (!JSZip) {
        alert('JSZipライブラリが読み込まれていません。しばらく待ってから再試行してください。');
        return;
      }
      
      const surgeryDate = elements.surgeryDateInput.value;
      const currentDate = new Date().toLocaleDateString('ja-JP');
      
      try {
        // DOCX形式のXMLコンテンツを作成
        let documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>手術前薬物中止判定結果</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>判定日: ${currentDate}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>手術予定日: ${surgeryDate}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>判定結果:</w:t>
      </w:r>
    </w:p>`;

        window.currentResults.forEach((result, index) => {
          const resultText = (result.text || result.error || '結果が取得できませんでした')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
          
          documentXml += `
    <w:p>
      <w:r>
        <w:t>${index + 1}. 薬剤名: ${result.drug}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>判定結果:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${resultText}</w:t>
      </w:r>
    </w:p>`;
        });
        
        documentXml += `
  </w:body>
</w:document>`;
        
        // JSZipを使用してDOCXファイルを作成
        const zip = new JSZip();
        
        // DOCXファイルの構造を追加
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
        
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        
        zip.file('word/document.xml', documentXml);
        
        zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Word</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <CharactersWithSpaces>0</CharactersWithSpaces>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`);
        
        zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>手術前薬物中止判定結果</dc:title>
  <dc:creator>手術前薬物中止判定システム</dc:creator>
  <cp:lastModifiedBy>手術前薬物中止判定システム</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`);
        
        // ZIPファイルを生成
        const docxContent = await zip.generateAsync({ type: 'blob' });
        
        // ファイル名を作成
        const fileName = `手術前薬物中止判定_${surgeryDate}_${currentDate.replace(/\//g, '')}.docx`;
        
        // ダウンロード
        const url = window.URL.createObjectURL(docxContent);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('DOCX文書をダウンロードしました:', fileName);
      } catch (error) {
        console.error('DOCX作成エラー:', error);
        alert('DOCXファイルの作成に失敗しました: ' + error.message);
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