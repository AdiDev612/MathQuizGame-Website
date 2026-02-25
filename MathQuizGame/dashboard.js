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
    'quiz': 'Start Quiz',
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
const MAX_TIME = 20;

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

            pageTitle.textContent = 'Start Quiz';

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
    easy: { max: 10, multMax: 5, divMax: 5 },
    medium: { max: 50, multMax: 12, divMax: 10 },
    hard: { max: 100, multMax: 20, divMax: 15 }
};

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Mobile step navigation
const nextToStep2Btn = document.getElementById('nextToStep2');
const backToStep1Btn = document.getElementById('backToStep1');
const setupStep1 = document.getElementById('setupStep1');
const setupStep2 = document.getElementById('setupStep2');
const stepDots = document.querySelectorAll('.step-dot');

if (nextToStep2Btn) {
    nextToStep2Btn.addEventListener('click', () => {
        setupStep1.classList.remove('active');
        setupStep2.classList.add('active');
        stepDots[0].classList.remove('active');
        stepDots[0].classList.add('completed');
        stepDots[1].classList.add('active');
    });
}

if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => {
        setupStep2.classList.remove('active');
        setupStep1.classList.add('active');
        stepDots[1].classList.remove('active');
        stepDots[0].classList.remove('completed');
        stepDots[0].classList.add('active');
    });
}

function beginQuiz() {
    const selectedCategory = document.querySelector('.category-btn.active').dataset.category;
    const selectedDifficulty = document.querySelector('.difficulty-btn.active').dataset.difficulty;

    quizType = selectedCategory;
    quizDifficulty = selectedDifficulty;

    document.getElementById('quizSetup').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';

    startQuiz(quizType);
}

function generateQuestion(type) {
    let num1, num2, answer, questionText;
    const diff = difficultySettings[quizDifficulty];

    if (type === 'mixed') {
        const types = ['addition', 'subtraction', 'multiplication', 'division'];
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
        'mixed': 'Mixed'
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

    document.getElementById('questionNumber').textContent = `Question ${currentQuestion + 1}/10`;
    document.getElementById('questionText').textContent = question.questionText;
    document.getElementById('progressFill').style.width = `${(currentQuestion + 1) * 10}%`;

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

    startTimer();
}

let timerStartTime = null;

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = MAX_TIME;
    timerStartTime = Date.now();
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        timeLeft = Math.max(0, MAX_TIME - elapsed);
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            nextQuestion();
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
        const timeBonus = Math.round((timeLeft / MAX_TIME) * 20);
        const questionScore = 10 + timeBonus;
        score += questionScore;
        correctAnswers++;

        showPointsEarned(questionScore);
    } else {
        wrongAnswers++;
    }

    totalPossibleScore += 30;

    updateStats();

    saveQuizState();

    document.getElementById('nextBtn').disabled = false;
    clearInterval(timerInterval);
}

function nextQuestion() {
    currentQuestion++;

    if (currentQuestion >= 10) {
        showResults();
    } else {
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
        document.getElementById('totalScore').textContent = stats.totalScore.toLocaleString();
        document.getElementById('quizzesCompleted').textContent = stats.quizzesCompleted;
        document.getElementById('avgTime').textContent = stats.avgTime + 's';
        document.getElementById('accuracy').textContent = stats.accuracy + '%';

        // Also update profile stats if they exist
        const pScore = document.getElementById('profileTotalScore');
        if (pScore) {
            pScore.textContent = stats.totalScore.toLocaleString();
            document.getElementById('profileQuizzes').textContent = stats.quizzesCompleted;
            document.getElementById('profileAccuracy').textContent = stats.accuracy + '%';
        }
    }

    const leaderboard = await DataService.getLeaderboard();
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

    const myRankIndex = leaderboard.findIndex(u => u.username === currentUser.username);
    const profileRank = document.getElementById('profileRank');
    if (profileRank) {
        profileRank.textContent = myRankIndex !== -1 ? `#${myRankIndex + 1}` : '#--';
    }
}

async function showResults() {
    clearInterval(timerInterval);
    clearQuizState();

    const maxScore = 10 * 30;
    const percentage = Math.round((score / maxScore) * 100);

    const totalAnswered = correctAnswers + wrongAnswers;
    const finalAccuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

    // Save the score and handle the result
    const saveResult = await DataService.saveScore({
        score: score,
        maxScore: maxScore,
        correctAnswers: correctAnswers,
        type: quizType,
        difficulty: quizDifficulty,
        accuracy: finalAccuracy,
        timeSpent: 200 - timeLeft
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
            <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 8px;">⏱️ Scoring: 10 base pts + up to 20 bonus pts for speed</p>
                <p style="font-size: 0.85rem; color: #6b7280;">Faster answers = More points!</p>
            </div>
            <p style="font-size: 1.25rem; color: #1f2937; margin-bottom: 32px;">
                ${emoji} ${message}
            </p>
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

    document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.difficulty-btn[data-difficulty="medium"]').classList.add('active');


    const setupStep1 = document.getElementById('setupStep1');
    const setupStep2 = document.getElementById('setupStep2');
    const stepDots = document.querySelectorAll('.step-dot');

    if (setupStep1 && setupStep2) {
        setupStep2.classList.remove('active');
        setupStep1.classList.add('active');
    }

    if (stepDots.length >= 2) {
        stepDots[1].classList.remove('active');
        stepDots[0].classList.remove('completed');
        stepDots[0].classList.add('active');
    }

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
