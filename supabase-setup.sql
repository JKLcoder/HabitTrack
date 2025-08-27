-- ==================== HabitTrack Outbox 同步 RPC 函数 ====================
-- 这些函数需要在 Supabase SQL Editor 中执行

-- 1. 创建习惯表（如果不存在）
CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    checkmarks JSONB DEFAULT '{}',
    weekly_highest INTEGER DEFAULT 0,
    weekly_target INTEGER DEFAULT 1,
    weekly_records JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建已归档习惯表（如果不存在）
CREATE TABLE IF NOT EXISTS archived_habits (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    archived_date TEXT NOT NULL,
    streak INTEGER NOT NULL,
    longest_streak INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建同步日志表（用于幂等性检查）
CREATE TABLE IF NOT EXISTS sync_mutations (
    mutation_id BIGINT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    operation TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    client_timestamp BIGINT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 启用 RLS (Row Level Security)
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mutations ENABLE ROW LEVEL SECURITY;

-- 5. 创建 RLS 策略
-- 习惯表策略
CREATE POLICY "Users can only access their own habits" ON habits
    FOR ALL USING (auth.uid() = user_id);

-- 归档习惯表策略
CREATE POLICY "Users can only access their own archived habits" ON archived_habits
    FOR ALL USING (auth.uid() = user_id);

-- 同步日志表策略
CREATE POLICY "Users can only access their own sync mutations" ON sync_mutations
    FOR ALL USING (auth.uid() = user_id);

-- ==================== RPC 函数 ====================

-- 1. 幂等习惯同步函数（创建/更新）
CREATE OR REPLACE FUNCTION upsert_habit_mutation(
    mutation_id BIGINT,
    operation TEXT,
    habit_id TEXT,
    habit_data JSONB,
    client_timestamp BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_mutation sync_mutations%ROWTYPE;
    result JSONB;
BEGIN
    -- 获取当前用户ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- 检查是否已经处理过这个 mutation（幂等性检查）
    SELECT * INTO existing_mutation 
    FROM sync_mutations 
    WHERE sync_mutations.mutation_id = upsert_habit_mutation.mutation_id
      AND user_id = current_user_id;
    
    IF FOUND THEN
        -- 已处理过，返回成功
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Mutation already processed',
            'mutation_id', mutation_id
        );
    END IF;
    
    -- 记录这个 mutation
    INSERT INTO sync_mutations (mutation_id, user_id, operation, entity_type, entity_id, client_timestamp)
    VALUES (mutation_id, current_user_id, operation, 'habit', habit_id, client_timestamp);
    
    -- 执行实际的数据操作
    IF operation = 'create' OR operation = 'update' THEN
        INSERT INTO habits (
            id, user_id, name, description, color, 
            checkmarks, weekly_highest, weekly_target, weekly_records,
            updated_at
        ) VALUES (
            habit_id,
            current_user_id,
            (habit_data->>'name')::TEXT,
            (habit_data->>'description')::TEXT,
            (habit_data->>'color')::TEXT,
            COALESCE(habit_data->'checkmarks', '{}'::JSONB),
            COALESCE((habit_data->>'weeklyHighest')::INTEGER, 0),
            COALESCE((habit_data->>'weeklyTarget')::INTEGER, 1),
            COALESCE(habit_data->'weeklyRecords', '{}'::JSONB),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            color = EXCLUDED.color,
            checkmarks = EXCLUDED.checkmarks,
            weekly_highest = EXCLUDED.weekly_highest,
            weekly_target = EXCLUDED.weekly_target,
            weekly_records = EXCLUDED.weekly_records,
            updated_at = NOW();
            
        result := jsonb_build_object(
            'success', true,
            'message', 'Habit upserted successfully',
            'mutation_id', mutation_id,
            'habit_id', habit_id
        );
    ELSE
        RAISE EXCEPTION 'Invalid operation: %', operation;
    END IF;
    
    RETURN result;
END;
$$;

-- 2. 习惯删除函数
CREATE OR REPLACE FUNCTION delete_habit_mutation(
    mutation_id BIGINT,
    operation TEXT,
    habit_id TEXT,
    habit_data JSONB,
    client_timestamp BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_mutation sync_mutations%ROWTYPE;
    result JSONB;
BEGIN
    -- 获取当前用户ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- 检查幂等性
    SELECT * INTO existing_mutation 
    FROM sync_mutations 
    WHERE sync_mutations.mutation_id = delete_habit_mutation.mutation_id
      AND user_id = current_user_id;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Mutation already processed',
            'mutation_id', mutation_id
        );
    END IF;
    
    -- 记录 mutation
    INSERT INTO sync_mutations (mutation_id, user_id, operation, entity_type, entity_id, client_timestamp)
    VALUES (mutation_id, current_user_id, operation, 'habit', habit_id, client_timestamp);
    
    -- 执行删除
    DELETE FROM habits 
    WHERE id = habit_id AND user_id = current_user_id;
    
    result := jsonb_build_object(
        'success', true,
        'message', 'Habit deleted successfully',
        'mutation_id', mutation_id,
        'habit_id', habit_id
    );
    
    RETURN result;
END;
$$;

-- 3. 归档习惯同步函数（创建/更新）
CREATE OR REPLACE FUNCTION upsert_archived_habit_mutation(
    mutation_id BIGINT,
    operation TEXT,
    archived_habit_id TEXT,
    archived_habit_data JSONB,
    client_timestamp BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_mutation sync_mutations%ROWTYPE;
    result JSONB;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- 检查幂等性
    SELECT * INTO existing_mutation 
    FROM sync_mutations 
    WHERE sync_mutations.mutation_id = upsert_archived_habit_mutation.mutation_id
      AND user_id = current_user_id;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Mutation already processed',
            'mutation_id', mutation_id
        );
    END IF;
    
    -- 记录 mutation
    INSERT INTO sync_mutations (mutation_id, user_id, operation, entity_type, entity_id, client_timestamp)
    VALUES (mutation_id, current_user_id, operation, 'archived_habit', archived_habit_id, client_timestamp);
    
    -- 执行操作
    IF operation = 'create' OR operation = 'update' THEN
        INSERT INTO archived_habits (
            id, user_id, name, description, color,
            archived_date, streak, longest_streak, updated_at
        ) VALUES (
            archived_habit_id,
            current_user_id,
            (archived_habit_data->>'name')::TEXT,
            (archived_habit_data->>'description')::TEXT,
            (archived_habit_data->>'color')::TEXT,
            (archived_habit_data->>'archivedDate')::TEXT,
            (archived_habit_data->>'streak')::INTEGER,
            (archived_habit_data->>'longestStreak')::INTEGER,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            color = EXCLUDED.color,
            archived_date = EXCLUDED.archived_date,
            streak = EXCLUDED.streak,
            longest_streak = EXCLUDED.longest_streak,
            updated_at = NOW();
            
        result := jsonb_build_object(
            'success', true,
            'message', 'Archived habit upserted successfully',
            'mutation_id', mutation_id,
            'archived_habit_id', archived_habit_id
        );
    ELSE
        RAISE EXCEPTION 'Invalid operation: %', operation;
    END IF;
    
    RETURN result;
END;
$$;

-- 4. 归档习惯删除函数
CREATE OR REPLACE FUNCTION delete_archived_habit_mutation(
    mutation_id BIGINT,
    operation TEXT,
    archived_habit_id TEXT,
    archived_habit_data JSONB,
    client_timestamp BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_mutation sync_mutations%ROWTYPE;
    result JSONB;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- 检查幂等性
    SELECT * INTO existing_mutation 
    FROM sync_mutations 
    WHERE sync_mutations.mutation_id = delete_archived_habit_mutation.mutation_id
      AND user_id = current_user_id;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Mutation already processed',
            'mutation_id', mutation_id
        );
    END IF;
    
    -- 记录 mutation
    INSERT INTO sync_mutations (mutation_id, user_id, operation, entity_type, entity_id, client_timestamp)
    VALUES (mutation_id, current_user_id, operation, 'archived_habit', archived_habit_id, client_timestamp);
    
    -- 执行删除
    DELETE FROM archived_habits 
    WHERE id = archived_habit_id AND user_id = current_user_id;
    
    result := jsonb_build_object(
        'success', true,
        'message', 'Archived habit deleted successfully',
        'mutation_id', mutation_id,
        'archived_habit_id', archived_habit_id
    );
    
    RETURN result;
END;
$$;

-- 5. 清理旧的同步日志函数（可选）
CREATE OR REPLACE FUNCTION cleanup_old_sync_mutations(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_mutations 
    WHERE processed_at < (NOW() - INTERVAL '1 day' * days_to_keep);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- 6. 获取用户习惯数据（用于初始同步）
CREATE OR REPLACE FUNCTION get_user_habits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    habits_data JSONB;
    archived_habits_data JSONB;
    result JSONB;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- 获取活跃习惯
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'description', description,
            'color', color,
            'checkmarks', checkmarks,
            'weeklyHighest', weekly_highest,
            'weeklyTarget', weekly_target,
            'weeklyRecords', weekly_records
        )
    ), '[]'::JSONB) INTO habits_data
    FROM habits 
    WHERE user_id = current_user_id;
    
    -- 获取归档习惯
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'description', description,
            'color', color,
            'archivedDate', archived_date,
            'streak', streak,
            'longestStreak', longest_streak
        )
    ), '[]'::JSONB) INTO archived_habits_data
    FROM archived_habits 
    WHERE user_id = current_user_id;
    
    result := jsonb_build_object(
        'habits', habits_data,
        'archivedHabits', archived_habits_data,
        'syncTime', extract(epoch from now()) * 1000
    );
    
    RETURN result;
END;
$$;