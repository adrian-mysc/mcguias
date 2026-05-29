-- lint 0003 (auth_rls_initplan) + 0006 (multiple_permissive_policies)
-- Substitui auth.uid() por (select auth.uid()) e separa policies FOR ALL
-- (que aplicavam SELECT redundante junto da policy pública de leitura).

-- ── achievements: separa owner em I/U/D, mantém leitura pública ──────────────
DROP POLICY IF EXISTS achievements_owner ON public.achievements;
CREATE POLICY achievements_insert ON public.achievements
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY achievements_update ON public.achievements
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY achievements_delete ON public.achievements
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ── quiz_sessions: separa owner em I/U/D, mantém leitura pública ─────────────
DROP POLICY IF EXISTS quiz_sessions_owner ON public.quiz_sessions;
CREATE POLICY quiz_sessions_insert ON public.quiz_sessions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY quiz_sessions_update ON public.quiz_sessions
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY quiz_sessions_delete ON public.quiz_sessions
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ── battle_stats: separa owner_write em I/U/D, mantém leitura pública ────────
DROP POLICY IF EXISTS battle_stats_owner_write ON public.battle_stats;
CREATE POLICY battle_stats_insert ON public.battle_stats
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY battle_stats_update ON public.battle_stats
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY battle_stats_delete ON public.battle_stats
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ── battles ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS battles_select ON public.battles;
DROP POLICY IF EXISTS battles_insert ON public.battles;
DROP POLICY IF EXISTS battles_update ON public.battles;
DROP POLICY IF EXISTS battles_delete ON public.battles;
CREATE POLICY battles_select ON public.battles FOR SELECT
  USING ((player1_id = (select auth.uid())) OR (player2_id = (select auth.uid())));
CREATE POLICY battles_insert ON public.battles FOR INSERT
  WITH CHECK (player1_id = (select auth.uid()));
CREATE POLICY battles_update ON public.battles FOR UPDATE
  USING ((player1_id = (select auth.uid())) OR (player2_id = (select auth.uid())));
CREATE POLICY battles_delete ON public.battles FOR DELETE
  USING ((player1_id = (select auth.uid())) OR (player2_id = (select auth.uid())));

-- ── push_subscriptions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS push_sub_select ON public.push_subscriptions;
DROP POLICY IF EXISTS push_sub_insert ON public.push_subscriptions;
DROP POLICY IF EXISTS push_sub_update ON public.push_subscriptions;
DROP POLICY IF EXISTS push_sub_delete ON public.push_subscriptions;
CREATE POLICY push_sub_select ON public.push_subscriptions FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY push_sub_insert ON public.push_subscriptions FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY push_sub_update ON public.push_subscriptions FOR UPDATE
  USING ((select auth.uid()) = user_id);
CREATE POLICY push_sub_delete ON public.push_subscriptions FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ── weekly_challenges ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS own_read ON public.weekly_challenges;
DROP POLICY IF EXISTS own_write ON public.weekly_challenges;
DROP POLICY IF EXISTS own_update ON public.weekly_challenges;
CREATE POLICY own_read ON public.weekly_challenges FOR SELECT
  USING ((select auth.uid()) = user_id);
CREATE POLICY own_write ON public.weekly_challenges FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY own_update ON public.weekly_challenges FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ── arena_participants ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS arena_participants_insert ON public.arena_participants;
DROP POLICY IF EXISTS arena_participants_update ON public.arena_participants;
CREATE POLICY arena_participants_insert ON public.arena_participants FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY arena_participants_update ON public.arena_participants FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ── arena_sessions ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS arena_sessions_insert ON public.arena_sessions;
DROP POLICY IF EXISTS arena_sessions_update ON public.arena_sessions;
CREATE POLICY arena_sessions_insert ON public.arena_sessions FOR INSERT
  WITH CHECK ((select auth.uid()) = host_id);
CREATE POLICY arena_sessions_update ON public.arena_sessions FOR UPDATE
  USING (
    (select auth.uid()) = host_id
    OR EXISTS (
      SELECT 1 FROM public.arena_participants
      WHERE arena_participants.session_id = arena_sessions.id
        AND arena_participants.user_id = (select auth.uid())
    )
  );
