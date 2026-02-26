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
            accuracy: scoreData.accuracy,
            mode: scoreData.mode
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
                accuracy: scoreData.accuracy,
                mode: scoreData.mode
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
            .select('score, accuracy, time_spent, mode')
            .eq('user_id', userId);

        const defaultStats = {
            totalScore: 0,
            quizzesCompleted: 0,
            avgTime: 0,
            accuracy: 0,
            modes: {
                classic: { totalScore: 0, quizzesCompleted: 0, avgTime: 0, accuracy: 0 },
                survival: { totalScore: 0, quizzesCompleted: 0, avgTime: 0, accuracy: 0 },
                blitz: { totalScore: 0, quizzesCompleted: 0, avgTime: 0, accuracy: 0 }
            }
        };

        if (error || !scores || scores.length === 0) {
            if (error) {
                console.error('Error fetching user stats:', error);
            }
            return defaultStats;
        }

        const createAgg = () => ({ sumScore: 0, sumAccuracy: 0, sumTime: 0, count: 0 });
        const agg = {
            total: createAgg(),
            classic: createAgg(),
            survival: createAgg(),
            blitz: createAgg()
        };

        scores.forEach(s => {
            const m = s.mode || 'classic'; // Default to classic for old data

            // Add to total
            agg.total.sumScore += (s.score || 0);
            agg.total.sumAccuracy += (s.accuracy || 0);
            agg.total.sumTime += (s.time_spent || 0);
            agg.total.count++;

            // Add to mode
            if (agg[m]) {
                agg[m].sumScore += (s.score || 0);
                agg[m].sumAccuracy += (s.accuracy || 0);
                agg[m].sumTime += (s.time_spent || 0);
                agg[m].count++;
            }
        });

        const finalizeAgg = (a) => ({
            totalScore: a.sumScore,
            quizzesCompleted: a.count,
            accuracy: a.count > 0 ? Math.round(a.sumAccuracy / a.count) : 0,
            avgTime: a.count > 0 ? Math.round(a.sumTime / a.count) : 0
        });

        return {
            ...finalizeAgg(agg.total),
            modes: {
                classic: finalizeAgg(agg.classic),
                survival: finalizeAgg(agg.survival),
                blitz: finalizeAgg(agg.blitz)
            }
        };
    },

    async getLeaderboard(mode = 'total') {
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
            .select('user_id, score, mode');

        if (scoresError || !scores) {
            if (scoresError) {
                console.error('Error fetching scores for leaderboard:', scoresError);
            }
            return [];
        }

        const aggregates = new Map();

        scores.forEach(s => {
            const m = s.mode || 'classic'; // Default to classic for old data
            if (mode === 'total' || mode === m) {
                const agg = aggregates.get(s.user_id) || { totalScore: 0, quizzesCompleted: 0 };
                agg.totalScore += s.score || 0;
                agg.quizzesCompleted += 1;
                aggregates.set(s.user_id, agg);
            }
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
    },

    async resetPassword(email, newPassword) {
        // Find user by email
        const { data: user, error: userError } = await supabaseClient
            .from('user')
            .select('id, username, email')
            .eq('email', email)
            .single();

        if (userError || !user) {
            console.error('Error finding user:', userError);
            return { success: false, message: 'User not found' };
        }

        // Update password
        const { data, error } = await supabaseClient
            .from('user')
            .update({ password: newPassword })
            .eq('id', user.id)
            .select('id, username, email')
            .single();

        if (error) {
            console.error('Error updating password:', error);
            return { success: false, message: 'Failed to reset password. Please try again.' };
        }

        console.log('✅ Password reset successfully for user:', user.username);
        return { success: true, message: 'Password reset successfully' };
    },

    async changeEmail(userId, newEmail) {
        // Check if email already exists
        const { data: existing, error: existingError } = await supabaseClient
            .from('user')
            .select('id')
            .eq('email', newEmail)
            .limit(1);

        if (existingError) {
            console.error('Error checking existing email:', existingError);
            return { success: false, message: 'Could not update email. Please try again.' };
        }

        if (existing && existing.length > 0) {
            return { success: false, message: 'Email is already taken by another account!' };
        }

        // Update email
        const { error } = await supabaseClient
            .from('user')
            .update({ email: newEmail })
            .eq('id', userId);

        if (error) {
            console.error('Error updating email:', error);
            return { success: false, message: 'Failed to update email. Please try again.' };
        }

        return { success: true, message: 'Email updated successfully' };
    },

    async changePassword(userId, newPassword) {
        // Update password
        const { error } = await supabaseClient
            .from('user')
            .update({ password: newPassword })
            .eq('id', userId);

        if (error) {
            console.error('Error updating password:', error);
            return { success: false, message: 'Failed to update password. Please try again.' };
        }

        return { success: true, message: 'Password updated successfully' };
    }
};
