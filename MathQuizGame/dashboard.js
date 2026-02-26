// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const currentUser = DataService.getCurrentUser();
if (!currentUser) {
    window.location.replace('index.html');
} else {
    const profileName = document.getElementById('profileNameDisplay');
    const profileEmail = document.getElementById('profileEmailDisplay');
    const profileAvatar = document.getElementById('profileAvatarDisplay');

    if (profileName) profileName.textContent = currentUser.username;
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileAvatar) profileAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
}

const navItems = document.querySelectorAll('.nav-item[data-section]');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('pageTitle');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const logoutBtn = document.querySelector('.logout');

// Preserve the original quiz container markup so we can restore it after showing results
const quizContainerElement = document.getElementById('quizContainer');
const initialQuizContainerHTML = quizContainerElement ? quizContainerElement.innerHTML : '';

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-active');
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        DataService.logout();
        localStorage.removeItem('currentSection');
        localStorage.removeItem('mathQuizState');
        window.location.replace('index.html');
    });
}

const pageTitles = {
    'dashboard': 'Dashboard',
    'quiz': 'Game Modes',
    'settings': 'Settings'
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionName = item.dataset.section;
        const sectionId = sectionName + 'Section';

        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        sections.forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');

        pageTitle.textContent = pageTitles[sectionName] || sectionName;

        localStorage.setItem('currentSection', sectionName);

        // Refresh dashboard stats whenever the user navigates back to it
        if (sectionName === 'dashboard') {
            updateDashboard();
        }

        if (window.innerWidth <= 600) {
            sidebar.classList.remove('mobile-active');
        }
    });
});

let currentQuestion = 0;
let score = 0;
let totalPossibleScore = 0;
let correctAnswers = 0;
let wrongAnswers = 0;
let selectedAnswer = null;
let quizType = 'addition';
let quizDifficulty = 'medium';
let questions = [];
let timerInterval = null;
let timeLeft = 20;
let MAX_TIME = 20;
let timerEndTime = null;
let quizStartTime = null;

function updateStats() {
    document.getElementById('currentScore').textContent = score;
    const totalAnswered = correctAnswers + wrongAnswers;
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    document.getElementById('currentAccuracy').textContent = accuracy + '%';
    document.getElementById('correctCount').textContent = correctAnswers;
    document.getElementById('wrongCount').textContent = wrongAnswers;
}

function saveQuizState() {
    const state = {
        currentQuestion,
        score,
        totalPossibleScore,
        correctAnswers,
        wrongAnswers,
        quizType,
        quizDifficulty,
        questions,
        timeLeft,
        isQuizActive: true,
        currentSection: 'quiz'
    };
    localStorage.setItem('mathQuizState', JSON.stringify(state));
}

function loadQuizState() {
    const saved = localStorage.getItem('mathQuizState');
    if (saved) {
        const state = JSON.parse(saved);
        if (state.isQuizActive) {
            currentQuestion = state.currentQuestion;
            score = state.score;
            totalPossibleScore = state.totalPossibleScore;
            correctAnswers = state.correctAnswers;
            wrongAnswers = state.wrongAnswers;
            quizType = state.quizType;
            quizDifficulty = state.quizDifficulty;
            questions = state.questions;
            timeLeft = state.timeLeft;

            sections.forEach(section => section.classList.remove('active'));
            document.getElementById('quizSection').classList.add('active');

            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-section="quiz"]').classList.add('active');

            pageTitle.textContent = 'Game Modes';

            document.getElementById('quizSetup').style.display = 'none';
            document.getElementById('quizContainer').style.display = 'block';

            updateStats();
            displayQuestion();

            return true;
        }
    }
    return false;
}

function clearQuizState() {
    localStorage.removeItem('mathQuizState');
}

const difficultySettings = {
    easy: { max: 25, multMax: 5, divMax: 10 },
    medium: { max: 50, multMax: 12, divMax: 10 },
    hard: { max: 100, multMax: 20, divMax: 15 }
};

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.difficulty-btn:not(.mode-card)').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn:not(.mode-card)').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.mode-card').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const classicOptions = document.getElementById('classicOptionsContainer');
        const survivalOptions = document.getElementById('survivalOptionsContainer');
        const modeSelection = document.getElementById('modeSelectionContainer');

        if (mode === 'classic') {
            if (modeSelection) modeSelection.style.display = 'none';
            if (classicOptions) classicOptions.style.display = 'block';
            if (survivalOptions) survivalOptions.style.display = 'none';

            // Set default active category and difficulty if none selected
            if (!document.querySelector('#classicOptionsContainer .category-btn.active')) {
                document.querySelector('#classicOptionsContainer .category-btn').classList.add('active');
            }
            if (!document.querySelector('#classicOptionsContainer .difficulty-btn.active')) {
                document.querySelector('#classicOptionsContainer .difficulty-btn[data-difficulty="medium"]').classList.add('active');
            }

        } else if (mode === 'survival') {
            if (modeSelection) modeSelection.style.display = 'none';
            if (classicOptions) classicOptions.style.display = 'none';
            if (survivalOptions) survivalOptions.style.display = 'block';

            // Set default active category and difficulty if none selected
            if (!document.querySelector('#survivalOptionsContainer .category-btn.active')) {
                document.querySelector('#survivalOptionsContainer .category-btn').classList.add('active');
            }
            if (!document.querySelector('#survivalOptionsContainer .difficulty-btn.active')) {
                document.querySelector('#survivalOptionsContainer .difficulty-btn[data-difficulty="medium"]').classList.add('active');
            }

        } else {
            alert(mode.charAt(0).toUpperCase() + mode.slice(1) + ' mode coming soon!');
        }
    });
});

// Category and Difficulty Selection Logic
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Only remove active class from buttons in the same container
        const container = btn.closest('#classicOptionsContainer, #survivalOptionsContainer');
        if (container) {
            container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else {
            // Fallback for older code if any
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });
});

document.querySelectorAll('.difficulty-btn:not(.mode-card)').forEach(btn => {
    btn.addEventListener('click', () => {
        // Only remove active class from buttons in the same container
        const container = btn.closest('#classicOptionsContainer, #survivalOptionsContainer');
        if (container) {
            container.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else {
            // Fallback
            document.querySelectorAll('.difficulty-btn:not(.mode-card)').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    });
});


window.beginClassicQuiz = function () {
    const activeCategory = document.querySelector('#classicOptionsContainer .category-btn.active');
    const activeDifficulty = document.querySelector('#classicOptionsContainer .difficulty-btn.active');

    quizType = activeCategory ? activeCategory.dataset.category : 'addition';
    quizDifficulty = activeDifficulty ? activeDifficulty.dataset.difficulty : 'medium';

    window.currentMode = 'classic';

    document.getElementById('quizSetup').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';

    startQuiz(quizType);
};

window.beginSurvivalQuiz = function () {
    const activeCategory = document.querySelector('#survivalOptionsContainer .category-btn.active');
    const activeDifficulty = document.querySelector('#survivalOptionsContainer .difficulty-btn.active');

    quizType = activeCategory ? activeCategory.dataset.category : 'addition';
    quizDifficulty = activeDifficulty ? activeDifficulty.dataset.difficulty : 'medium';

    // Set a global flag so startQuiz knows it's survival mode (if needed)
    window.currentMode = 'survival';

    document.getElementById('quizSetup').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';

    startQuiz(quizType);
};

window.goBackToModes = function () {
    const classicOptions = document.getElementById('classicOptionsContainer');
    const survivalOptions = document.getElementById('survivalOptionsContainer');
    const modeSelection = document.getElementById('modeSelectionContainer');

    if (classicOptions) classicOptions.style.display = 'none';
    if (survivalOptions) survivalOptions.style.display = 'none';
    if (modeSelection) modeSelection.style.display = 'block';
};



function generateQuestion(type) {
    let num1, num2, answer, questionText;
    const diff = difficultySettings[quizDifficulty];

    if (type === 'mixed') {
        const types = ['addition', 'subtraction', 'multiplication', 'division', 'pemdas'];
        type = types[Math.floor(Math.random() * types.length)];
    }

    switch (type) {
        case 'addition':
            num1 = Math.floor(Math.random() * diff.max) + 1;
            num2 = Math.floor(Math.random() * diff.max) + 1;
            answer = num1 + num2;
            questionText = `${num1} + ${num2} = ?`;
            break;
        case 'subtraction':
            num1 = Math.floor(Math.random() * diff.max) + Math.floor(diff.max / 2);
            num2 = Math.floor(Math.random() * Math.floor(diff.max / 2)) + 1;
            answer = num1 - num2;
            questionText = `${num1} − ${num2} = ?`;
            break;
        case 'multiplication':
            num1 = Math.floor(Math.random() * diff.multMax) + 1;
            num2 = Math.floor(Math.random() * diff.multMax) + 1;
            answer = num1 * num2;
            questionText = `${num1} × ${num2} = ?`;
            break;
        case 'division':
            num2 = Math.floor(Math.random() * diff.divMax) + 1;
            answer = Math.floor(Math.random() * diff.divMax) + 1;
            num1 = num2 * answer;
            questionText = `${num1} ÷ ${num2} = ?`;
            break;
        case 'pemdas':
            const pt = Math.floor(Math.random() * 4);
            let a = Math.floor(Math.random() * diff.max) + 1;
            let b = Math.floor(Math.random() * diff.multMax) + 1;
            let c = Math.floor(Math.random() * diff.multMax) + 1;
            if (pt === 0) {
                answer = a + (b * c);
                questionText = `${a} + ${b} × ${c} = ?`;
            } else if (pt === 1) {
                c = Math.floor(Math.random() * diff.multMax) + 1;
                answer = (a + b) * c;
                questionText = `(${a} + ${b}) × ${c} = ?`;
            } else if (pt === 2) {
                c = Math.floor(Math.random() * (a * b)) + 1;
                answer = (a * b) - c;
                questionText = `${a} × ${b} − ${c} = ?`;
            } else {
                a = (b * c) + Math.floor(Math.random() * diff.max) + 1;
                answer = a - (b * c);
                questionText = `${a} − ${b} × ${c} = ?`;
            }
            break;
    }

    const options = [answer];
    while (options.length < 4) {
        const wrongAnswer = answer + Math.floor(Math.random() * 10) - 5;
        if (wrongAnswer !== answer && wrongAnswer > 0 && !options.includes(wrongAnswer)) {
            options.push(wrongAnswer);
        }
    }

    options.sort(() => Math.random() - 0.5);

    return { questionText, answer, options };
}

function startQuiz(type) {
    quizType = type;
    currentQuestion = 0;
    score = 0;
    totalPossibleScore = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    questions = [];

    for (let i = 0; i < 10; i++) {
        questions.push(generateQuestion(type));
    }

    const categoryNames = {
        'addition': 'Addition',
        'subtraction': 'Subtraction',
        'multiplication': 'Multiplication',
        'division': 'Division',
        'mixed': 'Mixed',
        'pemdas': 'PEMDAS'
    };
    const difficultyNames = {
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard'
    };
    document.getElementById('quizCategory').textContent = categoryNames[quizType];
    document.getElementById('quizDifficulty').textContent = difficultyNames[quizDifficulty];

    updateStats();

    displayQuestion();
}

function displayQuestion() {
    const question = questions[currentQuestion];

    if (window.currentMode === 'survival') {
        document.getElementById('questionNumber').textContent = `Question ${currentQuestion + 1}`;
        document.getElementById('progressFill').style.width = '100%';
    } else {
        document.getElementById('questionNumber').textContent = `Question ${currentQuestion + 1}/10`;
        document.getElementById('progressFill').style.width = `${(currentQuestion + 1) * 10}%`;
    }

    document.getElementById('questionText').textContent = question.questionText;

    const optionsContainer = document.getElementById('quizOptions');
    optionsContainer.innerHTML = '';

    question.options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.onclick = () => selectAnswer(option);
        optionsContainer.appendChild(btn);
    });

    selectedAnswer = null;
    document.getElementById('nextBtn').disabled = true;

    const quizActions = document.querySelector('.quiz-actions');
    if (quizActions) {
        quizActions.style.display = window.currentMode === 'survival' ? 'none' : 'flex';
    }

    if (window.currentMode !== 'survival' || currentQuestion === 0) {
        startTimer();
    }
}

let timerStartTime = null;

function adjustTime(seconds) {
    if (window.currentMode === 'survival') {
        timerEndTime += seconds * 1000;
        const maxEndTime = Date.now() + 80 * 1000;
        if (timerEndTime > maxEndTime) {
            timerEndTime = maxEndTime;
        }
    }
}

function startTimer() {
    clearInterval(timerInterval);

    if (window.currentMode === 'survival') {
        if (currentQuestion === 0) {
            MAX_TIME = 60;
            timerEndTime = Date.now() + 60 * 1000;
        }
    } else {
        MAX_TIME = 20;
        timerEndTime = Date.now() + 20 * 1000;
    }

    quizStartTime = Date.now();
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (window.currentMode === 'survival') {
                showResults();
            } else {
                nextQuestion();
            }
        }
    }, 100);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (timeLeft <= 10) {
        document.getElementById('timer').style.color = '#ef4444';
    } else {
        document.getElementById('timer').style.color = '#22c55e';
    }
}

function selectAnswer(answer) {
    if (selectedAnswer !== null) return;

    selectedAnswer = answer;
    const correctAnswer = questions[currentQuestion].answer;
    const buttons = document.querySelectorAll('.option-btn');

    buttons.forEach(btn => {
        const btnValue = parseInt(btn.textContent);
        if (btnValue === correctAnswer) {
            btn.classList.add('correct');
        } else if (btnValue === answer && answer !== correctAnswer) {
            btn.classList.add('wrong');
        }
    });

    if (answer === correctAnswer) {
        let questionScore = 10;
        if (window.currentMode === 'classic') {
            const timeBonus = Math.round((timeLeft / MAX_TIME) * 20);
            questionScore += timeBonus;
        } else if (window.currentMode === 'survival') {
            const scoreMap = { easy: 10, medium: 20, hard: 30 };
            questionScore = scoreMap[quizDifficulty];
            const timeBonusMap = { easy: 2, medium: 3, hard: 4 };
            adjustTime(timeBonusMap[quizDifficulty]);
        }
        score += questionScore;
        correctAnswers++;

        showPointsEarned(questionScore);
    } else {
        if (window.currentMode === 'survival') {
            const timePenaltyMap = { easy: 3, medium: 4, hard: 5 };
            const penalty = timePenaltyMap[quizDifficulty];
            adjustTime(-penalty);
            showTimePenalty(`-${penalty}s`);
        }
        wrongAnswers++;
    }

    if (window.currentMode === 'classic') {
        totalPossibleScore += 30;
    } else {
        const scoreMap = { easy: 10, medium: 20, hard: 30 };
        totalPossibleScore += scoreMap[quizDifficulty];
    }

    updateStats();
    saveQuizState();

    document.getElementById('nextBtn').disabled = false;

    if (window.currentMode === 'classic') {
        clearInterval(timerInterval);
    } else {
        setTimeout(() => {
            if (timeLeft > 0) nextQuestion();
        }, 400);
    }
}

function nextQuestion() {
    currentQuestion++;

    if (window.currentMode !== 'survival' && currentQuestion >= 10) {
        showResults();
    } else {
        if (window.currentMode === 'survival') {
            if (currentQuestion >= questions.length - 2) {
                for (let i = 0; i < 5; i++) {
                    questions.push(generateQuestion(quizType));
                }
            }
        }
        saveQuizState();
        displayQuestion();
    }
}

function skipQuestion() {
    nextQuestion();
}

function showPointsEarned(points) {
    const container = document.querySelector('.quiz-question');
    const pointsEl = document.createElement('div');
    pointsEl.textContent = `+${points}`;
    pointsEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        font-weight: 700;
        color: #22c55e;
        animation: pointsFloat 1s ease-out forwards;
        pointer-events: none;
        z-index: 100;
    `;
    container.style.position = 'relative';
    container.appendChild(pointsEl);

    setTimeout(() => pointsEl.remove(), 1000);
}

function showTimePenalty(timeStr) {
    const container = document.querySelector('.quiz-question');
    const pointsEl = document.createElement('div');
    pointsEl.textContent = timeStr;
    pointsEl.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 2rem;
        font-weight: 700;
        color: #ef4444;
        animation: pointsFloat 1s ease-out forwards;
        pointer-events: none;
        z-index: 100;
    `;
    container.style.position = 'relative';
    container.appendChild(pointsEl);

    setTimeout(() => pointsEl.remove(), 1000);
}

const pointsStyle = document.createElement('style');
pointsStyle.textContent = `
    @keyframes pointsFloat {
        0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -100%) scale(1.2); }
        100% { opacity: 0; transform: translate(-50%, -150%) scale(1); }
    }
`;
document.head.appendChild(pointsStyle);

if (!loadQuizState()) {
    updateDashboard();
}

async function updateDashboard() {
    const currentUser = DataService.getCurrentUser();
    if (!currentUser) return;

    const stats = await DataService.getUserStats(currentUser.username);
    if (stats) {
        document.getElementById('classicTotalScore').textContent = stats.modes.classic.totalScore.toLocaleString();
        document.getElementById('survivalTotalScore').textContent = stats.modes.survival.totalScore.toLocaleString();
        document.getElementById('blitzTotalScore').textContent = stats.modes.blitz.totalScore.toLocaleString();

        const modeCards = document.querySelectorAll('.mode-stat-card');
        const detailsContainer = document.getElementById('modeStatsDetails');
        const modeTitle = document.getElementById('modeStatsTitle');
        const modeQuizzes = document.getElementById('modeQuizzesCompleted');
        const modeTime = document.getElementById('modeAvgTime');
        const modeAcc = document.getElementById('modeAccuracy');

        // cleanup old listeners if any by cloning
        modeCards.forEach(card => {
            card.onclick = () => {
                const isActive = card.style.borderColor === 'rgb(59, 130, 246)' || card.style.borderColor === '#3b82f6';

                modeCards.forEach(c => c.style.borderColor = 'transparent');

                if (isActive) {
                    detailsContainer.style.display = 'none';
                } else {
                    card.style.borderColor = '#3b82f6';
                    const mode = card.dataset.mode;
                    const modeData = stats.modes[mode];

                    modeTitle.textContent = mode.charAt(0).toUpperCase() + mode.slice(1) + ' Stats';
                    modeQuizzes.textContent = modeData.quizzesCompleted;
                    modeTime.textContent = modeData.avgTime + 's';
                    modeAcc.textContent = modeData.accuracy + '%';

                    // Move the details container immediately after the clicked card
                    card.after(detailsContainer);
                    detailsContainer.style.display = 'block';
                }
            };
        });

        // Also update profile stats if they exist
        const pScore = document.getElementById('profileTotalScore');
        if (pScore) {
            pScore.textContent = stats.totalScore.toLocaleString();
            document.getElementById('profileQuizzes').textContent = stats.quizzesCompleted;
            document.getElementById('profileAccuracy').textContent = stats.accuracy + '%';
        }
    }

    await loadLeaderboard();
}

window.loadLeaderboard = async function (mode = 'total') {
    const currentUser = DataService.getCurrentUser();
    if (!currentUser) return;

    const leaderboard = await DataService.getLeaderboard(mode);
    const lbList = document.getElementById('leaderboardList');
    if (lbList) {
        lbList.innerHTML = '';

        leaderboard.forEach((entry, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankIcon = rank;

            if (rank === 1) { rankClass = 'gold'; rankIcon = '🥇 1'; }
            else if (rank === 2) { rankClass = 'silver'; rankIcon = '🥈 2'; }
            else if (rank === 3) { rankClass = 'bronze'; rankIcon = '🥉 3'; }

            const isMe = entry.username === currentUser.username ? 'highlight' : '';

            const row = document.createElement('div');
            row.className = `leaderboard-row ${rankClass} ${isMe}`;
            row.innerHTML = `
                <span>${rankIcon}</span>
                <span>${entry.username}</span>
                <span>${entry.totalScore.toLocaleString()}</span>
                <span>${entry.quizzesCompleted}</span>
            `;
            lbList.appendChild(row);
        });
    }

    // Only update profile rank if we are viewing the total leaderboard
    if (mode === 'total') {
        const myRankIndex = leaderboard.findIndex(u => u.username === currentUser.username);
        const profileRank = document.getElementById('profileRank');
        if (profileRank) {
            profileRank.textContent = myRankIndex !== -1 ? `#${myRankIndex + 1}` : '#--';
        }
    }
}

async function showResults() {
    clearInterval(timerInterval);
    clearQuizState();

    let maxScore = 0;
    if (window.currentMode === 'classic') {
        maxScore = 10 * 30;
    } else {
        maxScore = totalPossibleScore;
        if (maxScore === 0) maxScore = 1; // prevent division by zero for percentage
    }
    const percentage = Math.round((score / maxScore) * 100);

    const totalAnswered = correctAnswers + wrongAnswers;
    const finalAccuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    const timeSpentAmount = window.currentMode === 'classic' ? (200 - timeLeft) : Math.floor((Date.now() - quizStartTime) / 1000);

    // Save the score and handle the result
    const saveResult = await DataService.saveScore({
        score: score,
        maxScore: maxScore,
        correctAnswers: correctAnswers,
        type: quizType,
        difficulty: quizDifficulty,
        accuracy: finalAccuracy,
        timeSpent: timeSpentAmount,
        mode: window.currentMode || 'classic'
    });

    if (!saveResult.success) {
        console.error('Failed to save score:', saveResult.message);
    } else {
        console.log('Score saved successfully');
    }

    // After saving the score, refresh dashboard stats and leaderboard
    await updateDashboard();

    let message, emoji;
    if (percentage >= 90) {
        message = 'Outstanding! You\'re a math genius!';
        emoji = '🏆';
    } else if (percentage >= 70) {
        message = 'Excellent work! Great speed and accuracy!';
        emoji = '🌟';
    } else if (percentage >= 50) {
        message = 'Good job! Keep practicing to improve your speed!';
        emoji = '👍';
    } else {
        message = 'Keep trying! Practice makes perfect!';
        emoji = '💪';
    }

    const quizContainer = document.querySelector('.quiz-container');
    quizContainer.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <h2 style="font-size: 2rem; color: #1f2937; margin-bottom: 16px;">Quiz Complete! 🎉</h2>
            <p style="font-size: 1rem; color: #6b7280; margin-bottom: 8px;">Your Score</p>
            <div style="font-size: 4rem; font-weight: 700; color: #22c55e; margin-bottom: 8px;">${score}</div>
            <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 24px;">out of ${maxScore} possible points</p>
            
            <div style="display: flex; justify-content: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                ${window.currentMode === 'survival' ? `
                <div style="background: white; border-radius: 12px; padding: 16px 32px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); text-align: center; min-width: 140px;">
                    <div style="font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Answered</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;">${correctAnswers + wrongAnswers}</div>
                </div>` : ''}
                <div style="background: white; border-radius: 12px; padding: 16px 32px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); text-align: center; min-width: 140px;">
                    <div style="font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Correct</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #22c55e;">${correctAnswers}</div>
                </div>
                <div style="background: white; border-radius: 12px; padding: 16px 32px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); text-align: center; min-width: 140px;">
                    <div style="font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Wrong</div>
                    <div style="font-size: 2rem; font-weight: 700; color: #ef4444;">${wrongAnswers}</div>
                </div>
            </div>

            <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
                <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 8px;">⏱️ Scoring: 10 base pts + up to 20 bonus pts for speed</p>
                <p style="font-size: 0.85rem; color: #6b7280;">Faster answers = More points!</p>
            </div>
            
            <div style="display: flex; gap: 16px; justify-content: center;">
                <button class="btn-primary" onclick="resetToSetup()">Play Again</button>
            </div>
        </div>
    `;
}

window.resetToSetup = resetToSetup;
window.backToDashboard = function () {
    window.location.reload();
};


function resetToSetup() {
    clearQuizState();


    const quizContainer = document.getElementById('quizContainer');
    if (quizContainer && typeof initialQuizContainerHTML === 'string') {
        quizContainer.innerHTML = initialQuizContainerHTML;
    }

    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('quizSetup').style.display = 'block';

    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.category-btn[data-category="addition"]').classList.add('active');

    document.querySelectorAll('.difficulty-btn:not(.mode-card)').forEach(btn => btn.classList.remove('active'));
    const defaultDiffBtn = document.querySelector('.difficulty-btn[data-difficulty="medium"]');
    if (defaultDiffBtn) defaultDiffBtn.classList.add('active');

    const modeSelection = document.getElementById('modeSelectionContainer');
    if (modeSelection) modeSelection.style.display = 'block';

    const classicOptions = document.getElementById('classicOptionsContainer');
    if (classicOptions) classicOptions.style.display = 'none';

    const survivalOptions = document.getElementById('survivalOptionsContainer');
    if (survivalOptions) survivalOptions.style.display = 'none';

    localStorage.setItem('currentSection', 'quiz');
}

function restoreSection() {
    const savedSection = localStorage.getItem('currentSection');
    if (savedSection) {
        const sectionId = savedSection + 'Section';

        navItems.forEach(nav => nav.classList.remove('active'));
        const navItem = document.querySelector(`[data-section="${savedSection}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        sections.forEach(section => section.classList.remove('active'));
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
            sectionElement.classList.add('active');
        }

        pageTitle.textContent = pageTitles[savedSection] || savedSection;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Toggle Email Form
    const toggleEmailBtn = document.getElementById('toggleEmailFormBtn');
    const emailForm = document.getElementById('changeEmailForm');
    if (toggleEmailBtn && emailForm) {
        toggleEmailBtn.addEventListener('click', () => {
            const isHidden = emailForm.style.display === 'none';
            emailForm.style.display = isHidden ? 'block' : 'none';
            toggleEmailBtn.classList.toggle('active', isHidden);
            toggleEmailBtn.textContent = isHidden ? 'Cancel Change Email' : 'Change Email';
        });
    }

    // Toggle Password Form
    const togglePasswordBtn = document.getElementById('togglePasswordFormBtn');
    const passwordForm = document.getElementById('changePasswordForm');
    if (togglePasswordBtn && passwordForm) {
        togglePasswordBtn.addEventListener('click', () => {
            const isHidden = passwordForm.style.display === 'none';
            passwordForm.style.display = isHidden ? 'block' : 'none';
            togglePasswordBtn.classList.toggle('active', isHidden);
            togglePasswordBtn.textContent = isHidden ? 'Cancel Change Password' : 'Change Password';
        });
    }

    // Change Email Handler
    const changeEmailForm = document.getElementById('changeEmailForm');
    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newEmailInput = document.getElementById('newEmail');
            const currentPasswordInput = document.getElementById('currentPasswordForEmail');
            const errorMessage = document.getElementById('emailErrorMessage');

            const newEmail = newEmailInput.value.trim();
            const currentPassword = currentPasswordInput.value;

            if (!newEmail || !currentPassword) {
                errorMessage.textContent = 'Please fill in all fields';
                return;
            }

            const currentUser = DataService.getCurrentUser();
            if (!currentUser) {
                errorMessage.textContent = 'User not logged in';
                return;
            }

            // Verify current password first
            const verifyResult = await DataService.loginUser(currentUser.username, currentPassword);
            if (!verifyResult.success) {
                errorMessage.textContent = 'Current password is incorrect';
                currentPasswordInput.value = '';
                return;
            }

            // Update email
            const result = await DataService.changeEmail(currentUser.id, newEmail);
            if (result.success) {
                showToast('Email updated successfully!', 'success');

                // Update local user data
                currentUser.email = newEmail;
                DataService.setCurrentUser(currentUser);
                document.getElementById('profileEmailDisplay').textContent = newEmail;

                changeEmailForm.reset();
                errorMessage.textContent = '';
            } else {
                errorMessage.textContent = result.message;
            }
        });
    }

    // Change Password Handler
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPasswordInput = document.getElementById('currentPassword');
            const newPasswordInput = document.getElementById('newPassword');
            const confirmPasswordInput = document.getElementById('confirmNewPassword');
            const errorMessage = document.getElementById('passwordErrorMessage');

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                errorMessage.textContent = 'Please fill in all fields';
                return;
            }

            const currentUser = DataService.getCurrentUser();
            if (!currentUser) {
                errorMessage.textContent = 'User not logged in';
                return;
            }

            // Verify current password
            const verifyResult = await DataService.loginUser(currentUser.username, currentPassword);
            if (!verifyResult.success) {
                errorMessage.textContent = 'Current password is incorrect';
                currentPasswordInput.value = '';
                return;
            }

            // Validate new password
            if (newPassword.length < 8) {
                errorMessage.textContent = 'Password must be at least 8 characters long';
                return;
            }

            if (newPassword.length > 32) {
                errorMessage.textContent = 'Password must be 32 characters or less';
                return;
            }

            if (newPassword !== confirmPassword) {
                errorMessage.textContent = 'New passwords do not match';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                return;
            }

            // Update password
            const result = await DataService.changePassword(currentUser.id, newPassword);
            if (result.success) {
                showToast('Password updated successfully!', 'success');
                changePasswordForm.reset();
                errorMessage.textContent = '';
            } else {
                errorMessage.textContent = result.message;
            }
        });
    }

    const quizLoaded = loadQuizState();

    if (!quizLoaded) {
        restoreSection();
    }
});

console.log('Math Quiz Dashboard loaded! 🎮');
