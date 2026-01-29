/**
 * Data Service - Handles all "database" operations using Local Storage
 */

const DB_KEYS = {
    USERS: 'math_quiz_users',
    CURRENT_USER: 'math_quiz_current_user',
    SCORES: 'math_quiz_scores'
};

const DataService = {
    // === User Management ===

    getAllUsers() {
        const users = localStorage.getItem(DB_KEYS.USERS);
        return users ? JSON.parse(users) : [];
    },

    saveUser(user) {
        const users = this.getAllUsers();
        // Check if username or email already exists
        if (users.find(u => u.username === user.username || u.email === user.email)) {
            return { success: false, message: 'Username or Email already exists!' };
        }

        users.push(user);
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        return { success: true };
    },

    loginUser(identifier, password) {
        const users = this.getAllUsers();
        // Allow login with either username or email
        const user = users.find(u => (u.username === identifier || u.email === identifier) && u.password === password);

        if (user) {
            // Remove password from session object
            const { password, ...safeUser } = user;
            this.setCurrentUser(safeUser);
            return { success: true, user: safeUser };
        }
        return { success: false, message: 'Invalid username/email or password' };
    },

    logout() {
        localStorage.removeItem(DB_KEYS.CURRENT_USER);
    },

    setCurrentUser(user) {
        localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
    },

    getCurrentUser() {
        const user = localStorage.getItem(DB_KEYS.CURRENT_USER);
        return user ? JSON.parse(user) : null;
    },

    // === Score Management ===

    saveScore(scoreData) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        const scores = this.getAllScores();
        const newScore = {
            userId: currentUser.username,
            date: new Date().toISOString(),
            ...scoreData
        };

        scores.push(newScore);
        localStorage.setItem(DB_KEYS.SCORES, JSON.stringify(scores));
        return true;
    },

    getAllScores() {
        const scores = localStorage.getItem(DB_KEYS.SCORES);
        return scores ? JSON.parse(scores) : [];
    },

    getUserHistory() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return [];

        const scores = this.getAllScores();
        return scores.filter(s => s.userId === currentUser.username);
    },

    getUserStats(username) {
        // If no username provided, use current user
        if (!username) {
            const current = this.getCurrentUser();
            if (!current) return null;
            username = current.username;
        }

        const scores = this.getAllScores();
        const userScores = scores.filter(s => s.userId === username);

        if (userScores.length === 0) {
            return {
                totalScore: 0,
                quizzesCompleted: 0,
                avgTime: 0,
                accuracy: 0
            };
        }

        const totalScore = userScores.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalaccuracy = userScores.reduce((sum, s) => sum + (s.accuracy || 0), 0);
        const totalTime = userScores.reduce((sum, s) => sum + (s.timeSpent || 0), 0);

        return {
            totalScore: totalScore,
            quizzesCompleted: userScores.length,
            accuracy: Math.round(totalaccuracy / userScores.length),
            avgTime: Math.round(totalTime / userScores.length)
        };
    },

    getLeaderboard() {
        const users = this.getAllUsers();
        const scores = this.getAllScores();

        // Aggregate scores per user
        const leaderboard = users.map(user => {
            const userScores = scores.filter(s => s.userId === user.username);
            const totalScore = userScores.reduce((sum, s) => sum + (s.score || 0), 0);

            return {
                username: user.username,
                totalScore: totalScore,
                quizzesCompleted: userScores.length
            };
        });

        // Sort by Total Score descending
        return leaderboard.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);
    }
};
