// ==========================================
// main.js
// 状態管理・UIレンダリング・イベント制御
// 企業・組織マネジメント向けリファクタリング版
// ==========================================

const appState = {
    lang: 'ja',
    screen: 'home', 
    tier: 1,
    pendingTier: 1,
    employeeInfo: { id: '', dept: '', role: '' },
    questions: [],
    currentIdx: 0,
    answers: {},
    history: JSON.parse(localStorage.getItem('hero_enterprise_history')) || [],
    affinityA: Object.keys(heroData.types)[0],
    affinityB: Object.keys(heroData.types)[0],
    affinityResult: null,
    shareText: ""
};

function setState(updates) {
    Object.assign(appState, updates);
    render();
}

function render() {
   ['home', 'entry', 'quiz', 'result', 'help'].forEach(screen => {
        document.getElementById(`screen-${screen}`).classList.toggle('hidden', appState.screen !== screen);
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
    document.getElementById('ui-desc').innerText = isJa ? "HEROに基づく組織レジリエンス及びコンピテンシー診断" : "Competency & Resilience Assessment based on HERO";
    document.getElementById('btn-tier1').innerText = isJa ? "簡易診断 (12問)" : "Quick Scan (12 Qs)";
    document.getElementById('btn-tier2').innerText = isJa ? "標準診断 (28問)" : "Standard Scan (28 Qs)";
    document.getElementById('btn-tier3').innerText = isJa ? "精密診断 (48問)" : "Deep Scan (48 Qs)";
    document.getElementById('ui-quick-affinity-title').innerText = isJa ? "人材シナジー・シミュレーター" : "Talent Synergy Simulator";
    document.getElementById('ui-quick-affinity-desc').innerText = isJa ? "2つのタイプを選択し、組織マネジメントにおける相互作用を確認します" : "Select two types to simulate organizational synergy";
    document.getElementById('btn-check-affinity').innerText = isJa ? "シナジーを算出" : "Calculate Synergy";
    document.getElementById('ui-history-title').innerText = isJa ? "受診履歴" : "Assessment History";
    document.getElementById('btn-clear-history').innerText = isJa ? "履歴を消去" : "Clear History";

    renderAffinityDropdowns();
    renderQuickAffinityResult();
    renderHistory();
}

function renderAffinityDropdowns() {
    const selectA = document.getElementById('affinity-type-a');
    const selectB = document.getElementById('affinity-type-b');
    
    if (selectA.options.length === 0) {
        for (const [key, data] of Object.entries(heroData.types)) {
            selectA.add(new Option(`[${key}] ${data.title[appState.lang]}`, key));
            selectB.add(new Option(`[${key}] ${data.title[appState.lang]}`, key));
        }
        selectA.addEventListener('change', (e) => setState({ affinityA: e.target.value, affinityResult: null }));
        selectB.addEventListener('change', (e) => setState({ affinityB: e.target.value, affinityResult: null }));
    } else {
        for (let i = 0; i < selectA.options.length; i++) {
            const key = selectA.options[i].value;
            const text = `[${key}] ${heroData.types[key].title[appState.lang]}`;
            selectA.options[i].text = text;
            selectB.options[i].text = text;
        }
    }
    selectA.value = appState.affinityA;
    selectB.value = appState.affinityB;
}

function renderQuickAffinityResult() {
    const resultDiv = document.getElementById('quick-affinity-result');
    if (appState.affinityResult) {
        resultDiv.classList.remove('hidden');
        document.getElementById('quick-result-relation').innerText = appState.affinityResult.relation;
        document.getElementById('quick-result-score').innerText = `シナジー値: ${appState.affinityResult.score}`;
        document.getElementById('quick-result-desc').innerText = appState.affinityResult.desc;
    } else {
        resultDiv.classList.add('hidden');
    }
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    const clearBtn = document.getElementById('btn-clear-history');
    historyList.innerHTML = '';
    
    if (appState.history.length === 0) {
        historyList.innerHTML = `<p style="color:var(--text-muted); font-size:14px; text-align:center;">${appState.lang === 'ja' ? '受診履歴はありません' : 'No history available.'}</p>`;
        clearBtn.classList.add('hidden');
        return;
    }
    
    clearBtn.classList.remove('hidden');
    const detailText = appState.lang === 'ja' ? "詳細" : "View";

    appState.history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.style.cursor = 'pointer';
        div.onclick = () => loadResultFromHistory(index);
        
        const titleStr = heroData.types[item.type] ? heroData.types[item.type].title[appState.lang] : item.title;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span><span style="color:#888; font-size:12px;">${item.date}</span><br><strong>[${item.type}]</strong> ${titleStr}</span>
                <span style="color:var(--accent-color); font-size:12px; border:1px solid var(--accent-color); border-radius:3px; padding:4px 8px;">${detailText}</span>
            </div>
        `;
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

    const isJa = appState.lang === 'ja';
    document.getElementById('btn-prev').disabled = appState.currentIdx === 0;
    document.getElementById('btn-prev').innerText = isJa ? "戻る" : "Back";
    document.getElementById('btn-next').innerText = appState.currentIdx === appState.questions.length - 1 
        ? (isJa ? "結果を解析する" : "Analyze Result") 
        : (isJa ? "次へ" : "Next");
}

function renderResult() {
    const isJa = appState.lang === 'ja';
    document.getElementById('ui-action-plan').innerText = isJa ? "■ マネジメント・アクションプラン" : "■ Management Action Plan";
    document.getElementById('ui-affinity').innerText = isJa ? "■ 組織内シナジー・マトリックス" : "■ Organizational Synergy Matrix";
    if(document.getElementById('btn-share-x')) document.getElementById('btn-share-x').innerText = isJa ? "結果を共有する" : "Share Result";
    document.getElementById('btn-home').innerText = isJa ? "ホームに戻る" : "Back to Home";
}

function renderHelp() {
    const isJa = appState.lang === 'ja';
    document.getElementById('ui-help-title').innerText = isJa ? "コンピテンシー・クラス一覧" : "Competency Class List";
    document.getElementById('ui-help-desc').innerText = isJa ? "心理的資本(HERO)に基づく全16タイプの定義" : "Definitions of all 16 types based on HERO";
    document.getElementById('btn-close-help').innerText = isJa ? "閉じる" : "Close";
    
    const helpList = document.getElementById('help-list');
    helpList.innerHTML = '';

    for (const [key, data] of Object.entries(heroData.types)) {
        const div = document.createElement('div');
        div.style.borderBottom = "1px solid var(--border-color)"; 
        div.style.paddingBottom = "16px"; 
        div.style.marginBottom = "16px";
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
window.goHome = () => setState({ screen: 'home', affinityResult: null });

window.abortQuiz = () => {
    if(confirm(appState.lang === 'ja' ? 'アセスメントを中断してホームに戻りますか？' : 'Abort the assessment and return to Home?')) {
        setState({ screen: 'home' });
    }
};

window.startQuiz = (tier) => {
    setState({ screen: 'entry', pendingTier: tier });
    
    // フォームをリセット
    document.getElementById('input-emp-id').value = '';
    document.getElementById('select-dept').value = '';
    document.getElementById('select-role').value = '';
    document.getElementById('check-consent').checked = false;
};

// 入力画面で「同意して開始」を押した時の処理
window.beginAssessment = () => {
    const empId = document.getElementById('input-emp-id').value.trim();
    const dept = document.getElementById('select-dept').value;
    const role = document.getElementById('select-role').value;
    const consent = document.getElementById('check-consent').checked;

    // バリデーション（入力チェック）
    if (!empId || !dept || !role) {
        alert("すべての必須項目（氏名、部署、役職）を入力してください。");
        return;
    }
    if (!consent) {
        alert("診断を開始するには、データ利用目的への同意が必要です。");
        return;
    }

    // チェックを通過したらクイズ画面へ
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
    const newAnswers = { ...appState.answers, [qId]: value };
    setState({ answers: newAnswers });
};

window.prevQuestion = () => {
    if (appState.currentIdx > 0) setState({ currentIdx: appState.currentIdx - 1 });
};

window.nextQuestion = () => {
    const qId = appState.questions[appState.currentIdx].id;
    if (!appState.answers[qId]) {
        alert(appState.lang === 'ja' ? '回答を選択してください' : 'Please select an option');
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
    
    const companyId = localStorage.getItem('hero_enterprise_cid') || 'GuestCompany';

    // 送信するデータを拡張
    const payload = {
        companyId: companyId,
        employeeId: appState.employeeInfo.id,     // 追加: 社員番号/氏名
        department: appState.employeeInfo.dept,   // 追加: 部署
        role: appState.employeeInfo.role,         // 追加: 役職
        date: dateStr,
        type: typeStr,
        title: titleStr,
        tier: appState.tier,
        percentages: percentages
    };

    // 企業版用のキー名に変更
    localStorage.setItem('hero_enterprise_history', JSON.stringify(newHistory));
    
    setState({ history: newHistory });
    displayResultScreen(typeStr, percentages);

    // Vercel APIプロキシを経由して送信
    fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        console.log('データ同期:', data);
        if (data.sheetUrl) showPortfolioLink(data.sheetUrl, companyId);
    })
    .catch(err => console.error('同期エラー:', err));

    displayResultScreen(typeStr, percentages);
}

// ポートフォリオ用のDB確認リンクUI
function showPortfolioLink(url, companyId) {
    const resultScreen = document.getElementById('screen-result');
    const div = document.createElement('div');
    div.style.marginTop = "24px";
    div.style.padding = "16px";
    div.style.border = "1px solid #28a745";
    div.style.backgroundColor = "#eafbf0";
    div.style.borderRadius = "6px";
    div.style.textAlign = "center";
    
    div.innerHTML = `
        <strong style="color:#28a745; font-size:14px;">【管理者ダッシュボード連携テスト】</strong><br>
        <span style="font-size:13px; color:#333;">${companyId} 専用の組織データテーブルが更新されました。</span><br>
        <a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-top:10px; background:#28a745; color:#fff; padding:8px 16px; border-radius:4px; text-decoration:none; font-size:14px; font-weight:bold;">
            バックエンドDBを確認
        </a>
    `;
    resultScreen.appendChild(div);
}

window.loadResultFromHistory = (index) => {
    const item = appState.history[index];
    let percs = item.percentages;
    if (!percs) {
        percs = {
            H: item.type[0] === 'H' ? 80 : 20,
            E: item.type[1] === 'H' ? 80 : 20,
            R: item.type[2] === 'H' ? 80 : 20,
            O: item.type[3] === 'H' ? 80 : 20
        };
    }
    displayResultScreen(item.type, percs);
};

function displayResultScreen(typeStr, percentages) {
    const resultData = heroData.types[typeStr] || heroData.types[Object.keys(heroData.types)[0]];
    const titleStr = resultData.title[appState.lang];
    
    const text = appState.lang === 'ja' 
        ? `心理的資本アセスメント(HERO)の解析結果：\n私のコンピテンシークラスは【 ${typeStr} : ${titleStr} 】でした。\n\n`
        : `HERO Psychological Capital Assessment:\nMy competency class is [ ${typeStr} : ${titleStr} ].\n\n`;

    document.getElementById('result-type').innerText = `Class: ${typeStr}`;
    document.getElementById('result-title').innerText = titleStr;
    document.getElementById('result-profile').innerText = resultData.profile[appState.lang];
    document.getElementById('result-action').innerText = resultData.action_plan[appState.lang];
    
    // 画像アセットの代わりにスタイリッシュなタイポグラフィでタイプ名を表現
    const imgContainer = document.querySelector('#screen-result div[style*="width: 80px"]');
    imgContainer.innerHTML = `<span style="font-size: 20px; font-weight: bold; color: var(--accent-color); line-height: 80px; letter-spacing: 2px;">${typeStr}</span>`;

    ['h', 'e', 'r', 'o'].forEach(cat => {
        document.getElementById(`bar-${cat}`).style.width = `${percentages[cat.toUpperCase()]}%`;
    });

    generateAffinityList(typeStr);
    setState({ screen: 'result', shareText: text });
}

function generateAffinityList(baseType) {
    const affinityListDiv = document.getElementById('affinity-list');
    affinityListDiv.innerHTML = '';
    let results = [];
    
    for (const [targetType, targetData] of Object.entries(heroData.types)) {
        const affData = calcAffinityLogic(baseType, targetType, appState.lang);
        results.push({ type: targetType, title: targetData.title[appState.lang], score: affData.score, relation: affData.relation });
    }
    
    results.sort((a, b) => b.score - a.score).forEach(item => {
        const div = document.createElement('div');
        div.className = 'affinity-item';
        div.innerHTML = `<div class="affinity-type">[${item.type}]</div><div class="affinity-title">${item.title}</div>
                         <div class="affinity-score-box"><span class="affinity-relation">${item.relation}</span><strong style="color:#222;">${item.score}</strong></div>`;
        affinityListDiv.appendChild(div);
    });
}

window.checkQuickAffinity = () => {
    const resultData = calcAffinityLogic(appState.affinityA, appState.affinityB, appState.lang);
    setState({ affinityResult: resultData });
};

window.clearHistory = () => {
    if(confirm(appState.lang === 'ja' ? '受診履歴をすべて消去しますか？' : 'Clear all assessment history?')) {
        localStorage.removeItem('hero_enterprise_history');
        setState({ history: [] });
    }
};

window.shareOnX = () => {
    const url = "https://wearehero.vercel.app/";
    const hashtags = "心理的資本,HEROアセスメント,組織開発";
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(appState.shareText)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
};

render();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(err => console.log('SW error: ', err));
    });
}