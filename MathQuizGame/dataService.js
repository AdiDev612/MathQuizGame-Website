// Supabase configuration
const SUPABASE_URL = 'https://fswnycvpmfufadyghypj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzd255Y3ZwbWZ1ZmFkeWdoeXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODU0MzAsImV4cCI6MjA4NzU2MTQzMH0.AtgS3TMcggPsVcnXGWyFTFEvGoclP7ot2zx78bEzNJ8';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DB_KEYS = {
    CURRENT_USER: 'math_quiz_current_user'
};

const DataService = {
    async getAllUsers() {
        const { data, error } = await supabaseClient
            .from('user')
            .select('id, email, username');

        if (error) {
            console.error('Error fetching users from Supabase:', error);
            return [];
        }
        return data || [];
    },

    async saveUser(user) {
        // Check for existing username or email
        const { data: existing, error: existingError } = await supabaseClient
            .from('user')
            .select('id')
            .or(`username.eq.${user.username},email.eq.${user.email}`)
            .limit(1);

        if (existingError) {
            console.error('Error checking existing user:', existingError);
            return { success: false, message: 'Could not create account. Please try again.' };
        }

        if (existing && existing.length > 0) {
            return { success: false, message: 'Username or Email already exists!' };
        }

        const { data, error } = await supabaseClient
            .from('user')
            .insert({
                email: user.email,
                username: user.username,
                password: user.password
            })
            .select('id, email, username')
            .single();

        if (error) {
            console.error('Error saving user:', error);
            return { success: false, message: 'Could not create account. Please try again.' };
        }

        return { success: true, user: data };
    },

    async loginUser(identifier, password) {
        // Try match by username or email
        const { data, error } = await supabaseClient
            .from('user')
            .select('id, email, username, password')
            .or(`username.eq.${identifier},email.eq.${identifier}`)
            .single();

        if (error || !data || data.password !== password) {
            if (error) {
                console.error('Error logging in user:', error);
            }
            return { success: false, message: 'Invalid username/email or password' };
        }

        const { password: _pw, ...safeUser } = data;
        this.setCurrentUser(safeUser);
        return { success: true, user: safeUser };
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


    async saveScore(scoreData) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.error('❌ No current user found. Cannot save score.');
            return { success: false, message: 'User not logged in' };
        }

        console.log('📝 Attempting to save score for user:', currentUser.id);
        console.log('📊 Score data:', {
            user_id: currentUser.id,
            score: scoreData.score,
            max_score: scoreData.maxScore,
            correct_answers: scoreData.correctAnswers,
            type: scoreData.type,
            difficulty: scoreData.difficulty,
            time_spent: scoreData.timeSpent,
            accuracy: scoreData.accuracy
        });

        try {
            const insertPayload = {
                user_id: currentUser.id,
                score: scoreData.score,
                max_score: scoreData.maxScore,
                correct_answers: scoreData.correctAnswers,
                type: scoreData.type,
                difficulty: scoreData.difficulty,
                time_spent: scoreData.timeSpent,
                accuracy: scoreData.accuracy
            };

            const { data, error } = await supabaseClient
                .from('scores')
                .insert([insertPayload])
                .select();

            if (error) {
                console.error('❌ Error saving score to Supabase:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                return { success: false, message: 'Failed to save score: ' + error.message };
            }
            
            console.log('✅ Score saved successfully:', data);
            return { success: true, message: 'Score saved successfully', data: data };
        } catch (err) {
            console.error('❌ Exception while saving score:', err);
            return { success: false, message: 'Unexpected error while saving score: ' + err.message };
        }
    },

    async getUserHistory() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return [];

        const { data, error } = await supabaseClient
            .from('scores')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user history:', error);
            return [];
        }

        return data || [];
    },

    async getUserStats(username) {
        let userId = null;

        if (username) {
            const { data: userRow, error: userError } = await supabaseClient
                .from('user')
                .select('id')
                .eq('username', username)
                .single();

            if (userError || !userRow) {
                console.error('Error fetching user for stats:', userError);
                return {
                    totalScore: 0,
                    quizzesCompleted: 0,
                    avgTime: 0,
                    accuracy: 0
                };
            }

            userId = userRow.id;
        } else {
            const current = this.getCurrentUser();
            if (!current) return null;
            userId = current.id;
        }

        const { data: scores, error } = await supabaseClient
            .from('scores')
            .select('score, accuracy, time_spent')
            .eq('user_id', userId);

        if (error || !scores || scores.length === 0) {
            if (error) {
                console.error('Error fetching user stats:', error);
            }
            return {
                totalScore: 0,
                quizzesCompleted: 0,
                avgTime: 0,
                accuracy: 0
            };
        }

        const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalaccuracy = scores.reduce((sum, s) => sum + (s.accuracy || 0), 0);
        const totalTime = scores.reduce((sum, s) => sum + (s.time_spent || 0), 0);

        return {
            totalScore: totalScore,
            quizzesCompleted: scores.length,
            accuracy: Math.round(totalaccuracy / scores.length),
            avgTime: Math.round(totalTime / scores.length)
        };
    },

    async getLeaderboard() {
        const { data: users, error: usersError } = await supabaseClient
            .from('user')
            .select('id, username');

        if (usersError || !users) {
            if (usersError) {
                console.error('Error fetching users for leaderboard:', usersError);
            }
            return [];
        }

        const { data: scores, error: scoresError } = await supabaseClient
            .from('scores')
            .select('user_id, score');

        if (scoresError || !scores) {
            if (scoresError) {
                console.error('Error fetching scores for leaderboard:', scoresError);
            }
            return [];
        }

        const aggregates = new Map();

        scores.forEach(s => {
            const agg = aggregates.get(s.user_id) || { totalScore: 0, quizzesCompleted: 0 };
            agg.totalScore += s.score || 0;
            agg.quizzesCompleted += 1;
            aggregates.set(s.user_id, agg);
        });

        const leaderboard = users.map(user => {
            const agg = aggregates.get(user.id) || { totalScore: 0, quizzesCompleted: 0 };
            return {
                username: user.username,
                totalScore: agg.totalScore,
                quizzesCompleted: agg.quizzesCompleted
            };
        });

        return leaderboard.sort((a, b) => b.totalScore - a.totalScore).slice(0, 5);
    }
};
