let allWords = [];
let wordQueue = [];
let masteredWords = [];
let totalWordsInLevel = 0;
let currentLevel = 1;
let currentCefr = "A1";
let currentWord = null;
let streak = 0;
let bestStreak = 0;
let totalCorrect = 0;
let totalAttempts = 0;
let lastAnswerWasWrong = false;

const CEFR_DATA = {
    "A1": { name: "Начинающий", emoji: "🌱", desc: "Базовые слова", startLevel: 1, endLevel: 30 },
    "A2": { name: "Элементарный", emoji: "🌿", desc: "Повседневная лексика", startLevel: 31, endLevel: 60 },
    "B1": { name: "Средний", emoji: "🌳", desc: "Промежуточный уровень", startLevel: 61, endLevel: 90 },
    "B2": { name: "Продвинутый", emoji: "🏔️", desc: "Уверенный уровень", startLevel: 91, endLevel: 120 },
    "C1": { name: "Профессиональный", emoji: "🏆", desc: "Автономное владение", startLevel: 121, endLevel: 150 },
    "C2": { name: "Владение", emoji: "💎", desc: "Свободное владение", startLevel: 151, endLevel: 180 }
};

function getCefrByLevel(level) {
    for (let key in CEFR_DATA) {
        if (level >= CEFR_DATA[key].startLevel && level <= CEFR_DATA[key].endLevel)
            return key;
    }
    return "A1";
}

// === Прогресс ===
function getProgress() {
    const saved = localStorage.getItem('easyVocabProgress');
    return saved ? JSON.parse(saved) : { unlockedLevel: 1, levelStars: {} };
}

function saveProgress(progress) {
    localStorage.setItem('easyVocabProgress', JSON.stringify(progress));
}

// === Загрузка слов ===
async function loadWords() {
    const response = await fetch('data/words.json');
    allWords = await response.json();
    showCefrScreen();
}

// === Экран выбора CEFR ===
function showCefrScreen() {
    document.getElementById('cefr-screen').style.display = 'block';
    document.getElementById('level-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'none';

    const progress = getProgress();
    const list = document.getElementById('cefr-list');
    list.innerHTML = '';

    const cefrKeys = ["A1", "A2", "B1", "B2", "C1", "C2"];

    for (let key of cefrKeys) {
        const data = CEFR_DATA[key];
        const isUnlocked = progress.unlockedLevel >= data.startLevel;

        // Считаем пройденные подуровни
        let completed = 0;
        for (let lv = data.startLevel; lv <= data.endLevel; lv++) {
            if (progress.levelStars[lv]) completed++;
        }
        const totalSubLevels = data.endLevel - data.startLevel + 1;

        const card = document.createElement('div');
        card.className = 'cefr-card' + (isUnlocked ? '' : ' locked');
        card.innerHTML = `
            <div class="cefr-icon">${data.emoji}</div>
            <div class="cefr-info">
                <div class="cefr-name">${key} — ${data.name}</div>
                <div class="cefr-desc">${data.desc} · ${totalSubLevels} уровней · ${completed}/${totalSubLevels} пройдено</div>
                <div class="cefr-progress">
                    <div class="cefr-progress-fill" style="width:${(completed/totalSubLevels*100)}%"></div>
                </div>
            </div>
            <div class="cefr-right">
                ${isUnlocked ? '' : '<div class="level-lock">🔒</div>'}
            </div>
        `;

        if (isUnlocked) {
            card.addEventListener('click', () => showLevelScreen(key));
        }

        list.appendChild(card);
    }
}

// === Экран выбора подуровня ===
function showLevelScreen(cefrKey) {
    currentCefr = cefrKey;
    const data = CEFR_DATA[cefrKey];
    const progress = getProgress();

    document.getElementById('cefr-screen').style.display = 'none';
    document.getElementById('level-screen').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('cefr-title').textContent = `${cefrKey} — ${data.name}`;

    const list = document.getElementById('level-list');
    list.innerHTML = '';

    for (let level = data.startLevel; level <= data.endLevel; level++) {
        const unlocked = level <= progress.unlockedLevel;
        const stars = progress.levelStars[level] || 0;
        const starsStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

        const card = document.createElement('div');
        card.className = 'level-card' + (unlocked ? '' : ' locked');
        card.innerHTML = `
            <div class="level-info">
                <div class="level-emoji">${data.emoji}</div>
                <div class="level-name">Уровень ${level}</div>
                <div class="level-desc">${data.name}</div>
            </div>
            <div class="level-right">
                ${unlocked
                    ? `<div class="level-stars">${starsStr}</div>`
                    : `<div class="level-lock">🔒</div>`}
            </div>
        `;

        if (unlocked) {
            card.addEventListener('click', () => startLevel(level));
        }

        list.appendChild(card);
    }
}

// === Начать уровень ===
function startLevel(level) {
    currentLevel = level;

    let levelWords = allWords.filter(w => w.level === level);
    levelWords.sort(() => Math.random() - 0.5);

    wordQueue = [...levelWords];
    masteredWords = [];
    totalWordsInLevel = levelWords.length;
    streak = 0;
    bestStreak = 0;
    totalCorrect = 0;
    totalAttempts = 0;
    lastAnswerWasWrong = false;

    const cefrKey = getCefrByLevel(level);
    const data = CEFR_DATA[cefrKey];

    document.getElementById('level-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('level-title').textContent = `📖 Уровень ${level} — ${data.name}`;
    document.getElementById('streak').textContent = '🔥 0';

    showWord();
}

// === Показать слово ===
function showWord() {
    currentWord = wordQueue.shift();

    document.getElementById('word-emoji').textContent = currentWord.emoji;
    document.getElementById('hint').textContent = '_ '.repeat(currentWord.word.length).trim();
    document.getElementById('answer').value = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('check-btn').style.display = 'block';
    document.getElementById('next-btn').style.display = 'none';
    document.getElementById('answer').disabled = false;
    updateCounter();
    document.getElementById('answer').focus();
    playSound();
    updateProgress();
}

// === Озвучка ===
function playSound() {
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
}

// === Счётчик ===
function updateCounter() {
    document.getElementById('counter').textContent = `${masteredWords.length} / ${totalWordsInLevel}`;
}

// === Проверка ответа ===
function checkAnswer() {
    const answer = document.getElementById('answer').value.trim().toLowerCase();
    const feedback = document.getElementById('feedback');
    totalAttempts++;

    if (answer === currentWord.word) {
        feedback.textContent = '✅ ' + currentWord.word + ' — ' + currentWord.translation;
        feedback.className = 'feedback correct';
        masteredWords.push(currentWord);
        totalCorrect++;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        lastAnswerWasWrong = false;
        updateCounter();
        updateProgress();
    } else {
        feedback.textContent = '❌ Правильно: ' + currentWord.word + ' — ' + currentWord.translation;
        feedback.className = 'feedback wrong';
        streak = 0;
        lastAnswerWasWrong = true;
    }

    document.getElementById('streak').textContent = '🔥 ' + streak;
    document.getElementById('check-btn').style.display = 'none';
    document.getElementById('next-btn').style.display = 'block';
    document.getElementById('answer').disabled = true;
}

// === Следующее слово ===
function nextWord() {
    if (lastAnswerWasWrong) {
        const reQueue = [...masteredWords, currentWord];
        reQueue.sort(() => Math.random() - 0.5);
        wordQueue = [...reQueue, ...wordQueue];
        masteredWords = [];
        updateCounter();
        updateProgress();
    }

    if (wordQueue.length === 0) {
        showResult();
    } else {
        showWord();
    }
}

// === Результат ===
function showResult() {
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('result-screen').style.display = 'block';

    const accuracy = Math.round((totalCorrect / totalAttempts) * 100);

    let stars = 1;
    if (totalAttempts === totalWordsInLevel) stars = 3;
    else if (totalAttempts <= totalWordsInLevel * 1.5) stars = 2;

    const progress = getProgress();
    const prevStars = progress.levelStars[currentLevel] || 0;
    if (stars > prevStars) {
        progress.levelStars[currentLevel] = stars;
    }
    if (currentLevel < 180 && progress.unlockedLevel < currentLevel + 1) {
        progress.unlockedLevel = currentLevel + 1;
    }
    saveProgress(progress);

    document.getElementById('result-emoji').textContent = stars === 3 ? '🎉' : (stars === 2 ? '👍' : '💪');
    document.getElementById('result-title').textContent = 'Уровень пройден!';
    document.getElementById('result-text').textContent =
        `Освоено слов: ${totalCorrect}\n` +
        `Всего попыток: ${totalAttempts}\n` +
        `Точность: ${accuracy}%\n` +
        `Звёзды: ${'⭐'.repeat(stars)}\n` +
        `Лучшая серия: 🔥 ${bestStreak}`;

    document.getElementById('next-level-btn').style.display =
        (currentLevel < 180) ? 'block' : 'none';
}

// === Прогресс-бар ===
function updateProgress() {
    const percent = (masteredWords.length / totalWordsInLevel) * 100;
    document.getElementById('progress-fill').style.width = percent + '%';
}

// === События ===
document.getElementById('check-btn').addEventListener('click', checkAnswer);
document.getElementById('next-btn').addEventListener('click', nextWord);
document.getElementById('retry-btn').addEventListener('click', () => startLevel(currentLevel));
document.getElementById('next-level-btn').addEventListener('click', () => startLevel(currentLevel + 1));
document.getElementById('back-to-levels-btn').addEventListener('click', () => showLevelScreen(currentCefr));
document.getElementById('back-btn').addEventListener('click', () => showLevelScreen(currentCefr));
document.getElementById('cefr-back-btn').addEventListener('click', showCefrScreen);

document.getElementById('reset-progress').addEventListener('click', () => {
    localStorage.removeItem('easyVocabProgress');
    showCefrScreen();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (document.getElementById('game-screen').style.display === 'none') return;
        if (document.getElementById('check-btn').style.display !== 'none') {
            checkAnswer();
        } else {
            nextWord();
        }
    }
});

// === Старт ===
loadWords();
