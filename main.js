// URLパラメータから企業IDを取得しローカルストレージに保存
const urlParams = new URLSearchParams(window.location.search);
const cid = urlParams.get('cid');
if (cid) {
    localStorage.setItem('hero_enterprise_cid', cid);
    window.history.replaceState({}, document.title, window.location.pathname);
}

const appState = {
    lang: 'ja',
    screen: 'home', 
    tier: 1,
    pendingTier: 1, // 入力フォーム画面中の一時保存用
    employeeInfo: { id: '', dept: '', role: '' }, // 従業員情報
    questions: [],
    currentIdx: 0,
    answers: {},
    history: JSON.parse(localStorage.getItem('hero_enterprise_history')) || [],
    shareText: ""
};

function setState(updates) {
    Object.assign(appState, updates);
    render();
}

function render() {
    ['home', 'entry', 'quiz', 'result', 'help'].forEach(screen => {
        const el = document.getElementById(`screen-${screen}`);
        if(el) el.classList.toggle('hidden', appState.screen !== screen);
    });

    document.getElementById('btn-help').innerText = appState.lang === 'ja' ? "クラス一覧" : "Class List";
    
    switch (appState.screen) {
        case 'home':   renderHome();   break;
        case 'quiz':   renderQuiz();   break;
        case 'result': renderResult(); break;
        case 'help':   renderHelp();   break;
    }
}

function renderHome() {
    const isJa = appState.lang === 'ja';
    document.getElementById('ui-title').innerText = isJa ? "心理的資本アセスメント" : "HERO Assessment";
    document.getElementById('btn-tier1').innerText = isJa ? "簡易診断 (12問)" : "Quick Scan (12 Qs)";
    document.getElementById('btn-tier2').innerText = isJa ? "標準診断 (28問)" : "Standard Scan (28 Qs)";
    document.getElementById('btn-tier3').innerText = isJa ? "精密診断 (48問)" : "Deep Scan (48 Qs)";
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    const clearBtn = document.getElementById('btn-clear-history');
    historyList.innerHTML = '';
    
    if (appState.history.length === 0) {
        historyList.innerHTML = `<p style="color:var(--text-muted); font-size:14px; text-align:center;">受診履歴はありません</p>`;
        if(clearBtn) clearBtn.classList.add('hidden');
        return;
    }
    
    if(clearBtn) clearBtn.classList.remove('hidden');
    appState.history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style.cursor = 'pointer';
        div.onclick = () => loadResultFromHistory(index);
        const titleStr = heroData.types[item.type] ? heroData.types[item.type].title[appState.lang] : item.title;
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;">
                <span><span style="color:#888; font-size:12px;">${item.date}</span><br><strong>[${item.type}]</strong> ${titleStr}</span>
            </div>`;
        historyList.appendChild(div);
    });
}

function renderQuiz() {
    const q = appState.questions[appState.currentIdx];
    if (!q) return;

    document.getElementById('quiz-progress').innerText = `設問 ${appState.currentIdx + 1} / ${appState.questions.length}`;
    document.getElementById('question-text').innerText = q.text[appState.lang];
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    heroData.app_config.scale.forEach(scale => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        if (appState.answers[q.id] === scale.value) btn.classList.add('selected');
        btn.innerText = scale.label[appState.lang];
        btn.onclick = () => handleAnswer(q.id, scale.value);
        optionsContainer.appendChild(btn);
    });

    document.getElementById('btn-prev').disabled = appState.currentIdx === 0;
    document.getElementById('btn-next').innerText = appState.currentIdx === appState.questions.length - 1 ? "結果を解析する" : "次へ";
}

function renderResult() {
    const isJa = appState.lang === 'ja';
    document.getElementById('ui-action-plan').innerText = "■ マネジメント・アクションプラン";
    document.getElementById('btn-home').innerText = "ホームに戻る";
}

function renderHelp() {
    document.getElementById('ui-help-title').innerText = "コンピテンシー・クラス一覧";
    document.getElementById('btn-close-help').innerText = "閉じる";
    
    const helpList = document.getElementById('help-list');
    helpList.innerHTML = '';
    for (const [key, data] of Object.entries(heroData.types)) {
        const div = document.createElement('div');
        div.style.borderBottom = "1px solid var(--border-color)"; 
        div.style.paddingBottom = "16px"; div.style.marginBottom = "16px";
        div.innerHTML = `<div style="color: var(--accent-color); font-size: 15px; font-weight: 600; margin-bottom: 6px;">[${key}] ${data.title[appState.lang]}</div>
                         <div style="font-size: 13px; line-height: 1.6; color: #444;">${data.profile[appState.lang]}</div>`;
        helpList.appendChild(div);
    }
}

document.getElementById('lang-toggle').addEventListener('click', () => {
    setState({ lang: appState.lang === 'ja' ? 'en' : 'ja' });
});

window.showHelp = () => setState({ screen: 'help' });
window.closeHelp = () => setState({ screen: 'home' });
window.goHome = () => setState({ screen: 'home' });

window.abortQuiz = () => {
    if(confirm('アセスメントを中断してホームに戻りますか？')) {
        setState({ screen: 'home' });
    }
};

// 【変更点】コース選択時はクイズではなく入力フォームへ遷移
window.startQuiz = (tier) => {
    setState({ screen: 'entry', pendingTier: tier });
    document.getElementById('input-emp-id').value = '';
    document.getElementById('select-dept').value = '';
    document.getElementById('select-role').value = '';
    document.getElementById('check-consent').checked = false;
};

// 【新規】同意して開始ボタンの処理
window.beginAssessment = () => {
    const empId = document.getElementById('input-emp-id').value.trim();
    const dept = document.getElementById('select-dept').value;
    const role = document.getElementById('select-role').value;
    const consent = document.getElementById('check-consent').checked;

    if (!empId || !dept || !role) {
        alert("すべての必須項目（氏名、部署、役職）を入力してください。");
        return;
    }
    if (!consent) {
        alert("診断を開始するには、データ利用目的への同意が必要です。");
        return;
    }

    const tier = appState.pendingTier;
    setState({
        screen: 'quiz',
        tier: tier,
        employeeInfo: { id: empId, dept: dept, role: role },
        questions: heroData.questions.filter(q => q.tier <= tier),
        currentIdx: 0,
        answers: {}
    });
};

window.handleAnswer = (qId, value) => {
    setState({ answers: { ...appState.answers, [qId]: value } });
};

window.prevQuestion = () => {
    if (appState.currentIdx > 0) setState({ currentIdx: appState.currentIdx - 1 });
};

window.nextQuestion = () => {
    const qId = appState.questions[appState.currentIdx].id;
    if (!appState.answers[qId]) {
        alert('回答を選択してください');
        return;
    }
    if (appState.currentIdx < appState.questions.length - 1) {
        setState({ currentIdx: appState.currentIdx + 1 });
    } else {
        calculateAndSaveResult();
    }
};

function calculateAndSaveResult() {
    const { typeStr, percentages } = calculateScore(appState.questions, appState.answers);
    const resultData = heroData.types[typeStr] || heroData.types[Object.keys(heroData.types)[0]];
    const titleStr = resultData.title[appState.lang];
    
    const date = new Date();
    const dateStr = `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
    const newHistory = [{ date: dateStr, type: typeStr, title: titleStr, tier: appState.tier, percentages: percentages }, ...appState.history];
    
    localStorage.setItem('hero_enterprise_history', JSON.stringify(newHistory));
    setState({ history: newHistory });

    // --- 企業IDと入力データの送信 ---
    const companyId = localStorage.getItem('hero_enterprise_cid') || 'GuestCompany';
    const payload = {
        companyId: companyId,
        employeeId: appState.employeeInfo.id,
        department: appState.employeeInfo.dept,
        role: appState.employeeInfo.role,
        date: dateStr,
        type: typeStr,
        title: titleStr,
        tier: appState.tier,
        percentages: percentages
    };

    fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        console.log('API Response:', data);
        if (data.sheetUrl) showPortfolioLink(data.sheetUrl, companyId);
    })
    .catch(err => console.error('API Error:', err));

    displayResultScreen(typeStr, percentages);
}

window.loadResultFromHistory = (index) => {
    const item = appState.history[index];
    displayResultScreen(item.type, item.percentages || {H:50, E:50, R:50, O:50});
};

function displayResultScreen(typeStr, percentages) {
    const resultData = heroData.types[typeStr] || heroData.types[Object.keys(heroData.types)[0]];
    
    document.getElementById('result-type').innerText = `Class: ${typeStr}`;
    document.getElementById('result-title').innerText = resultData.title[appState.lang];
    document.getElementById('result-profile').innerText = resultData.profile[appState.lang];
    document.getElementById('result-action').innerText = resultData.action_plan[appState.lang];
    
    const imgContainer = document.querySelector('#screen-result div[style*="width: 80px"]');
    imgContainer.innerHTML = `<span style="font-size: 20px; font-weight: bold; color: var(--accent-color); line-height: 80px; letter-spacing: 2px;">${typeStr}</span>`;

    ['h', 'e', 'r', 'o'].forEach(cat => {
        document.getElementById(`bar-${cat}`).style.width = `${percentages[cat.toUpperCase()]}%`;
    });

    setState({ screen: 'result' });
}

// ポートフォリオ用：生成されたスプレッドシートへのリンクを表示
function showPortfolioLink(url, companyId) {
    const resultScreen = document.getElementById('screen-result');
    const div = document.createElement('div');
    div.id = "portfolio-link-box"; // 複数追加防止用
    div.style.marginTop = "24px"; div.style.padding = "16px"; div.style.border = "1px solid #28a745";
    div.style.backgroundColor = "#eafbf0"; div.style.borderRadius = "6px"; div.style.textAlign = "center";
    
    div.innerHTML = `
        <strong style="color:#28a745; font-size:14px;">【管理者ダッシュボード連携テスト】</strong><br>
        <span style="font-size:13px; color:#333;">${companyId} 専用の組織データテーブルが自動更新されました。</span><br>
        <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:10px; background:#28a745; color:#fff; padding:8px 16px; border-radius:4px; text-decoration:none; font-size:14px; font-weight:bold;">
            バックエンドDB（スプレッドシート）を確認
        </a>
    `;
    
    // 既にリンクがあれば消す（再テスト時）
    const existing = document.getElementById('portfolio-link-box');
    if(existing) existing.remove();
    
    // ホームに戻るボタンの前に挿入
    const btnHome = document.getElementById('btn-home');
    resultScreen.insertBefore(div, btnHome);
}

window.clearHistory = () => {
    if(confirm('受診履歴をすべて消去しますか？')) {
        localStorage.removeItem('hero_enterprise_history');
        setState({ history: [] });
    }
};

render();