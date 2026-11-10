DROP FUNCTION IF EXISTS public.get_dashboard_summary(UUID);

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_active_sites_count INTEGER := 0;
  v_total_surveys_count INTEGER := 0;
  v_recent_surveys_count INTEGER := 0;
  v_previous_period_surveys_count INTEGER := 0;
  v_growth_percentage INTEGER := 0;
  v_recent_activity JSONB := '[]'::JSONB;
  v_map_points JSONB := '[]'::JSONB;
BEGIN
  -- p_user_id is kept in the signature for compatibility with the frontend call contract.
  PERFORM p_user_id;

  SELECT COUNT(*)::INTEGER
  INTO v_active_sites_count
  FROM public.sites s
  WHERE s.deleted_at IS NULL
    AND s.status = 'active';

  SELECT COUNT(*)::INTEGER
  INTO v_total_surveys_count
  FROM public.surveys sv
  WHERE sv.deleted_at IS NULL
    AND sv.type = ANY(ARRAY['gas', 'soil', 'groundwater', 'pid']::public.survey_type[]);

  SELECT COUNT(*)::INTEGER
  INTO v_recent_surveys_count
  FROM public.surveys sv
  WHERE sv.deleted_at IS NULL
    AND sv.type = ANY(ARRAY['gas', 'soil', 'groundwater', 'pid']::public.survey_type[])
    AND sv.created_at >= (NOW() - INTERVAL '30 days');

  SELECT COUNT(*)::INTEGER
  INTO v_previous_period_surveys_count
  FROM public.surveys sv
  WHERE sv.deleted_at IS NULL
    AND sv.type = ANY(ARRAY['gas', 'soil', 'groundwater', 'pid']::public.survey_type[])
    AND sv.created_at >= (NOW() - INTERVAL '60 days')
    AND sv.created_at < (NOW() - INTERVAL '30 days');

  v_growth_percentage := CASE
    WHEN v_previous_period_surveys_count > 0 THEN
      ROUND(
        ((v_recent_surveys_count - v_previous_period_surveys_count)::NUMERIC
          / v_previous_period_surveys_count::NUMERIC) * 100
      )::INTEGER
    WHEN v_recent_surveys_count > 0 THEN 100
    ELSE 0
  END;

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', sv.id,
        'type', sv.type,
        'name', sv.name,
        'created_at', sv.created_at,
        'site_name', st.name,
        'site_id', sv.site_id
      )
      ORDER BY sv.created_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_recent_activity
  FROM (
    SELECT s.id, s.type, s.name, s.created_at, s.site_id
    FROM public.surveys s
    WHERE s.deleted_at IS NULL
      AND s.type = ANY(ARRAY['gas', 'soil', 'groundwater', 'pid']::public.survey_type[])
    ORDER BY s.created_at DESC
    LIMIT 10
  ) sv
  LEFT JOIN public.sites st
    ON st.id = sv.site_id
   AND st.deleted_at IS NULL;

  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', s.id,
        'name', s.name,
        'city', s.city,
        'project_number', s.project_number,
        'coordinates', s.coordinates
      )
      ORDER BY s.updated_at DESC
    ),
    '[]'::JSONB
  )
  INTO v_map_points
  FROM public.sites s
  WHERE s.deleted_at IS NULL
    AND s.status = 'active';

  RETURN JSONB_BUILD_OBJECT(
    'stats', JSONB_BUILD_OBJECT(
      'active_sites_count', v_active_sites_count,
      'total_surveys_count', v_total_surveys_count,
      'recent_surveys_count', v_recent_surveys_count,
      'growth_percentage', v_growth_percentage
    ),
    'recent_activity', v_recent_activity,
    'map_points', v_map_points
  );
END;
$$;
