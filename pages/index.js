import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // --- Begin: Provided script logic adapted for React/Next.js ---
    console.log('アプリケーションが初期化されました');
    console.log('現在のURL:', window.location.href);
    console.log('現在のホスト名:', window.location.hostname);
    
    // Dify API設定
    const DIFY_CONFIG = {
      url: '/api/judge', // Next.js API route
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
      errorMessage: document.getElementById('error-message')
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

    // 初期状態の設定
    hideResults();
    hideError();
    const today = new Date().toISOString().split('T')[0];
    elements.surgeryDateInput.min = today;

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
      const medicineName = elements.medicineNameInput.value.trim();
      const surgeryDate = elements.surgeryDateInput.value;
      const isValid = medicineName && surgeryDate;
      elements.submitBtn.disabled = !isValid;
    }
    function getFormData() {
      return {
        drug: elements.medicineNameInput.value.trim(),
        surgeryDate: elements.surgeryDateInput.value
      };
    }
    function validateFormData(formData) {
      if (!formData.drug) {
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
    function formatResults(text) {
      if (!text) {
        return '<div class="result-item">結果が取得できませんでした。</div>';
      }
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
    function displayResults(response) {
      let resultText = '';
      if (response.text) {
        resultText = response.text;
      } else if (response.data && response.data.outputs && response.data.outputs.text) {
        resultText = response.data.outputs.text;
      } else if (response.outputs && response.outputs.text) {
        resultText = response.outputs.text;
      } else if (typeof response === 'string') {
        resultText = response;
      } else {
        resultText = JSON.stringify(response, null, 2);
      }
      const formattedResults = formatResults(resultText);
      elements.resultsContent.innerHTML = formattedResults;
      showResults();
      elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    async function handleFormSubmit(event) {
      event.preventDefault();
      const formData = getFormData();
      if (!validateFormData(formData)) return;
      setLoadingState(true);
      hideResults();
      hideError();
      try {
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
        displayResults(responseData);
      } catch (error) {
        displayError(error.message);
      } finally {
        setLoadingState(false);
      }
    }
    // --- End: Provided script logic ---
  }, []);

  return (
    <div className="container">
      <header className="header">
        <h1>手術前薬物中止判定システム</h1>
        <p className="subtitle">手術前に服用中の薬の中止時期を確認できます</p>
      </header>
      <main className="main-content">
        <div className="form-container">
          <form id="medicineForm" className="medicine-form" autoComplete="off">
            <div className="form-group">
              <label htmlFor="medicine-name">薬剤名</label>
              <input type="text" id="medicine-name" name="medicine-name" placeholder="例：アスピリン" required />
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
          <h2 className="results-title">判定結果</h2>
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